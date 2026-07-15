import { useEffect, useRef, useState } from 'react';

interface VideoBackdropProps {
  src: string;
  poster: string;
  /** Alt-equivalent for the still frame; the element is decorative by default. */
  label?: string;
}

/** True when the visitor has asked the browser to conserve data. */
const prefersLessData = () =>
  (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData === true;

/**
 * Full-bleed background video that plays once and settles onto its final frame.
 *
 * The clip is a one-shot camera push-in, so looping it would be visibly jarring
 * and freezing on the last decoded frame is unreliable across browsers. Instead
 * we cross-fade to a still poster of that same frame when the video ends.
 *
 * This sits on the login page, which every user hits on every visit, so the
 * 4MB clip is strictly an enhancement: the poster alone is a complete hero, and
 * we skip the video entirely for reduced-motion or data-saver visitors rather
 * than making them pay for it. `preload="metadata"` keeps the clip off the
 * critical path for everyone else — the poster paints first, video streams in.
 */
export function VideoBackdrop({ src, poster, label }: VideoBackdropProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  // The video fades in only once it is actually rendering frames. Until then
  // (and while the 4MB clip buffers) the poster is what shows.
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(
    () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false,
  );
  const [saveData] = useState(prefersLessData);

  // Poster-only: never mount the video, so it is never fetched.
  const posterOnly = reducedMotion || saveData;

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    if (posterOnly) return;
    const video = videoRef.current;
    if (!video) return;
    // Autoplay can be refused (iOS low-power mode, permissions); the poster is
    // already the base layer, so a refusal just means we stay on it.
    video.play()?.catch(() => setVideoPlaying(false));
  }, [posterOnly]);

  return (
    <div className="absolute inset-0 overflow-hidden bg-[#0d0d0d]" aria-hidden="true">
      {/* The poster is the reliable base layer: 400KB, paints as soon as it
          loads, and is the video's own final frame. It stays visible underneath
          the video the whole time, so there is never a blank dark panel while
          the clip buffers or if autoplay is refused. */}
      <div
        role={label ? 'img' : undefined}
        aria-label={label}
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${poster})` }}
      />
      {!posterOnly && (
        <video
          ref={videoRef}
          src={src}
          muted
          playsInline
          preload="metadata"
          onPlaying={() => setVideoPlaying(true)}
          onEnded={() => setVideoPlaying(false)}
          onError={() => setVideoPlaying(false)}
          data-playing={videoPlaying}
          className="absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-[1500ms] ease-out data-[playing=true]:opacity-100"
        />
      )}
      <div className="absolute inset-0 bg-black/60" />
    </div>
  );
}
