-- Seed challenges and competition_config with initial data

-- Competition config: one default row
insert into public.competition_config (key, event_name, duration_seconds)
values ('default', 'Geminathon-CTF', 3600)
on conflict (key) do update set
  event_name = excluded.event_name,
  duration_seconds = excluded.duration_seconds,
  updated_at = now();

-- Challenges: same as built-in app data (so DB is not empty)
insert into public.challenges (id, title, category, description, base_points, flag, hints, hint_times, file_url)
values
  (
    'forensics-1',
    'Money Laundering Part 1',
    'Forensics',
    'A network traffic capture (pcap) was found on a suspicious server. It seems like someone was trying to hide their tracks while transferring digital assets. Can you trace the laundering process?

File: money_laundering_part1.pcap',
    100,
    'FLAG{D1RT_M0N3Y_H1DD3N_1N_PLA1N_S1GHT}',
    ARRAY['Open the pcap file in Wireshark and look for common protocols like HTTP or FTP.', 'Check for exported objects or data streams that might contain the flag.'],
    ARRAY[300000, 600000],
    '/ctf/1/money_laundering_part1.pcap'
  ),
  (
    'forensics-2',
    'Money Laundering Part 2',
    'Forensics',
    'The trail continues. The laundered assets are moving through even more complex channels. The second part of the capture contains deeper obfuscation. Find the final destination of the flag.

File: money_laundering_part2.pcap',
    200,
    'FLAG{G3TT1NG_TUFF3R_3HHEHEHE}',
    ARRAY['Look for encrypted or unusual traffic. Sometimes data is hidden in the TCP/UDP payload in non-standard ways.', 'Use ''follow stream'' on interesting looking connections to see the full data exchange.'],
    ARRAY[1200000, 1500000],
    '/ctf/2/money_laundering_part2.pcap'
  ),
  (
    'forensics-3',
    'Chal.jpg',
    'Forensics',
    'A simple image file. Or is it? There''s a secret hidden within these pixels that only a keen eye—and the right tools—can reveal.

File: chal.jpg',
    150,
    'FLAG{C0L0R5_OR_WH4TTTTT}',
    ARRAY['Check the image metadata using strings or exiftool.', 'Try using steganography tools like steghide or zsteg if the metadata doesn''t yield results.'],
    ARRAY[2100000, 2700000],
    '/ctf/3/chal.jpg'
  )
on conflict (id) do update set
  title = excluded.title,
  category = excluded.category,
  description = excluded.description,
  base_points = excluded.base_points,
  flag = excluded.flag,
  hints = excluded.hints,
  hint_times = excluded.hint_times,
  file_url = excluded.file_url;
