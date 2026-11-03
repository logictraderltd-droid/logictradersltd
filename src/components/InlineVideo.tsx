import { getYouTubeEmbedUrl } from "@/lib/video";

function getVideoSource(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.hostname !== "localhost") return null;

    const youtubeUrl = getYouTubeEmbedUrl(url.toString());
    if (youtubeUrl) return { kind: "embed" as const, src: youtubeUrl };

    const hostname = url.hostname.toLowerCase().replace(/^www\./, "");
    if (hostname === "vimeo.com" || hostname === "player.vimeo.com") {
      const videoId = url.pathname.match(/\/(?:video\/)?(\d+)/)?.[1];
      if (videoId) return { kind: "embed" as const, src: `https://player.vimeo.com/video/${videoId}` };
    }

    if (hostname === "drive.google.com") {
      const fileId = url.pathname.match(/\/file\/d\/([^/]+)/)?.[1];
      if (fileId) return { kind: "embed" as const, src: `https://drive.google.com/file/d/${fileId}/preview` };
    }

    if (/\.(mp4|webm|ogg|mov|m4v)$/i.test(url.pathname)) {
      return { kind: "file" as const, src: url.toString() };
    }

    return { kind: "embed" as const, src: url.toString() };
  } catch {
    return null;
  }
}

export function InlineVideo({ url, title }: { url: string; title: string }) {
  const source = getVideoSource(url);
  if (!source) return <p className="text-sm text-gray-500">This video link is not valid.</p>;

  if (source.kind === "file") {
    return (
      <video className="aspect-video w-full bg-black" src={source.src} controls playsInline preload="metadata">
        Your browser does not support embedded video.
      </video>
    );
  }

  return (
    <iframe
      className="aspect-video w-full bg-black"
      src={source.src}
      title={title}
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
      allowFullScreen
      referrerPolicy="strict-origin-when-cross-origin"
    />
  );
}
