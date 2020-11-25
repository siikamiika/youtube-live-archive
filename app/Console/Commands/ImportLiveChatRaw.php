<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class ImportLiveChatRaw extends Command
{
    protected $signature = 'live_chat:import_raw {video_id}';
    protected $description = 'Import raw live chat replay files to database';

    public function handle()
    {
        $videoId = $this->argument('video_id');

        $video = \App\Models\Video::with('files')->find($videoId);
        if (!$video) {
            throw new \RuntimeException('Video not found');
        }

        $liveChatFile = $video->files->where('type', 'live_chat')->first();
        if (!$liveChatFile) {
            return;
        }

        \DB::table('youtube_live_chat_message')->where('video_id', $video->id)->delete();

        $fh = fopen($liveChatFile->getPath($video), 'r');
        $seq = 0;
        while ($line = stream_get_line($fh, 0x100000, "\n")) {
            $data = json_decode($line, true);
            $offset = intval($data['replayChatItemAction']['videoOffsetTimeMsec']);
            if ($offset > 1000000000000) {
                $this->info('Offset out of range, skipping: '. json_encode($data));
                continue;
            }
            $tickerRenderer = $this->parseTickerRenderer($data);
            $durationMsec = $tickerRenderer
                ? intval($tickerRenderer['durationSec']) * 1000
                : 1;

            if ($offset === 0) {
                $messageRenderer = $tickerRenderer
                    ? $this->parseTickerMessageRenderer($tickerRenderer)
                    : $this->parseMessageRenderer($data);
                if ($messageRenderer) {
                    $offset = $this->parseTimestampText($messageRenderer);
                }
            }

            \DB::table('youtube_live_chat_message')->insert([
                'video_id' => $video->id,
                'seq' => $seq,
                'time_range' => sprintf('[%s,%s)', $offset, $offset + $durationMsec),
                'data' => $line,
            ]);

            ++$seq;
        }

        return 0;
    }

    private function parseTickerRenderer(array $data): ?array
    {
        $item = $data['replayChatItemAction']['actions'][0]['addLiveChatTickerItemAction']['item'] ?? null;
        if (!$item) {
            return null;
        }

        $tickerRenderer = $item['liveChatTickerPaidMessageItemRenderer']
            ?? $item['liveChatTickerSponsorItemRenderer']
            ?? $item['liveChatTickerPaidStickerItemRenderer']
            ?? null;
        if (!$tickerRenderer) {
            throw new \RuntimeException('Unknown ticker renderer: ' . json_encode($item));
        }
        return $tickerRenderer;
    }

    private function parseTickerMessageRenderer(array $tickerRenderer): ?array
    {
        $container = $tickerRenderer['showItemEndpoint']['showLiveChatItemEndpoint']['renderer'] ?? null;
        if (!$container) {
            throw new \RuntimeException('No message renderer container: ' . json_encode($tickerRenderer));
        }

        $messageRenderer = $container['liveChatPaidMessageRenderer']
            ?? $container['liveChatMembershipItemRenderer']
            ?? $container['liveChatPaidStickerRenderer']
            ?? null;
        if (!$messageRenderer) {
            throw new \RuntimeException('No message renderer: ' . json_encode($container));
        }
        return $messageRenderer;
    }

    private function parseMessageRenderer(array $data): ?array
    {
        $item = $data['replayChatItemAction']['actions'][0]['addChatItemAction']['item'] ?? null;
        if (!$item) {
            return null;
        }
        return $item['liveChatTextMessageRenderer']
            ?? $item['liveChatPaidMessageRenderer']
            ?? $item['liveChatMembershipItemRenderer']
            ?? $item['liveChatPaidStickerRenderer']
            ?? null;
    }

    private function parseTimestampText(array $renderer): int
    {
        $timestampText = $renderer['timestampText']['simpleText'] ?? null;
        if (!$timestampText) { return 0; }
        $negative = preg_match('/^-/', $timestampText);
        if (!preg_match_all('/[0-9]+/', $timestampText, $matches)) {
            throw new \RuntimeException('No matches for timestamp parts: ' . $timestampText);
        }
        $parts = array_reverse(array_map('intval', $matches[0]));
        $multipliers = [1000, 60, 60];
        if (count($parts) > count($multipliers)) {
            throw new \RuntimeException('Too many timestamp parts: ' . $timestampText);
        }
        $multiplier = 1;
        $result = 0;
        for ($i = 0; $i < count($parts); $i++) {
            $multiplier *= $multipliers[$i];
            $result += $multiplier * $parts[$i];
        }
        return ($negative ? -1 : 1) * $result;
    }
}
