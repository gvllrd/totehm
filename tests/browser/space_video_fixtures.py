"""Local camera + multi-quality HLS fixtures. No real account or media."""
from pathlib import Path
import subprocess
import sys

root = Path(sys.argv[1] if len(sys.argv) > 1 else '/tmp/space-portrait-fixtures')
root.mkdir(parents=True, exist_ok=True)

def ffmpeg(args):
    result = subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', *args], capture_output=True, text=True)
    if result.returncode:
        raise RuntimeError(result.stderr)

# Colored sides should disappear in the portrait crop. The white square must
# remain square: a stretched landscape recording fails the image check.
landscape = 'color=c=blue:s=3840x2160:r=30,drawbox=x=0:y=0:w=1310:h=2160:color=red:t=fill,drawbox=x=1310:y=0:w=1220:h=2160:color=lime:t=fill,drawbox=x=1820:y=980:w=200:h=200:color=white:t=fill'
portrait = 'color=c=lime:s=1080x1920:r=30,drawbox=x=440:y=860:w=200:h=200:color=white:t=fill'
for name, source in [('landscape', landscape), ('portrait', portrait)]:
    ffmpeg(['-f', 'lavfi', '-i', source, '-frames:v', '2', '-pix_fmt', 'yuv420p', str(root / (name + '.y4m'))])
for name, size, bitrate in [('high', '1080x1920', '8000000'), ('low', '270x480', '600000')]:
    ffmpeg(['-f', 'lavfi', '-i', 'testsrc2=size=' + size + ':rate=24', '-t', '2', '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '18', '-pix_fmt', 'yuv420p', '-g', '24', '-f', 'hls', '-hls_time', '1', '-hls_list_size', '0', '-hls_segment_filename', str(root / (name + '%02d.ts')), str(root / (name + '.m3u8'))])
(root / 'playlist.m3u8').write_text('#EXTM3U\n#EXT-X-STREAM-INF:BANDWIDTH=600000,RESOLUTION=270x480\nlow.m3u8\n#EXT-X-STREAM-INF:BANDWIDTH=8000000,RESOLUTION=1080x1920\nhigh.m3u8\n')
print(root)
