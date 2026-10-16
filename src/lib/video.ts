export function getYouTubeEmbedUrl(url?: string | null, autoplay = false): string | null {
  if (!url) return null;

  try {
    const parsedUrl = new URL(url);
    const hostname = parsedUrl.hostname.toLowerCase().replace(/^www\./, '').replace(/^m\./, '');
    let videoId: string | null = null;

    if (hostname === 'youtu.be') {
      videoId = parsedUrl.pathname.split('/').filter(Boolean)[0] || null;
    } else if (hostname === 'youtube.com' || hostname === 'youtube-nocookie.com') {
      videoId = parsedUrl.searchParams.get('v');
      if (!videoId) {
        videoId = parsedUrl.pathname.match(/^\/(?:embed|shorts|live)\/([^/]+)/)?.[1] || null;
      }
    }

    if (!videoId || !/^[\w-]{11}$/.test(videoId)) return null;

    const embedUrl = new URL(`https://www.youtube-nocookie.com/embed/${videoId}`);
    embedUrl.searchParams.set('rel', '0');
    embedUrl.searchParams.set('playsinline', '1');
    if (autoplay) embedUrl.searchParams.set('autoplay', '1');
    return embedUrl.toString();
  } catch {
    return null;
  }
}
