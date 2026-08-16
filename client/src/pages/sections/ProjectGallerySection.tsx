import { useState } from "react";
import { GalleryBlock, ProjectImageAsset } from "@/types/project";
import { ContainerLayout } from "@/components/ContainerLayout";

/** Returns true when src points to a known video file extension. */
const isVideoSrc = (src: string): boolean =>
  /\.(mp4|webm|mov|ogg)(\?.*)?$/i.test(src);

interface ProjectGallerySectionProps {
  blocks: GalleryBlock[];
}

/**
 * Single image that fills its container, rounded corners, object-cover.
 *
 * Always attempts to load the real image. If the file is missing (404) the
 * component falls back to a grey placeholder slot automatically — the owner
 * just drops a file into client/public/figmaAssets/ and the slot is replaced.
 * The `isPlaceholder` flag is treated as a hint to skip the initial network
 * request, but does not need to be cleared after photography is added.
 */
const GalleryImage = ({
  image,
  className = "",
}: {
  image: ProjectImageAsset;
  className?: string;
}): JSX.Element => {
  const [failed, setFailed] = useState(false);
  const zoom = image.zoom ?? 1;
  const origin = image.objectPosition ?? "center center";

  // Safety net: if a video file somehow reaches GalleryImage (e.g. stale cached
  // data that bypassed the server adapter fix), render it as <video> instead of
  // letting it hit the broken-image fallback that prints the raw URL as text.
  if (isVideoSrc(image.src)) {
    return (
      <div className={`overflow-hidden rounded-[4px] ${className}`}>
        <video
          src={image.src}
          controls
          playsInline
          className="h-full w-full object-cover"
          style={{ display: "block" }}
        >
          Your browser does not support HTML5 video.
        </video>
      </div>
    );
  }

  return (
    <div className={`overflow-hidden rounded-[4px] ${className}`}>
      {failed ? (
        <div
          className="flex h-full w-full items-center justify-center bg-gray-100"
          role="img"
          aria-label={image.alt}
          data-src={image.src}
        >
          <p
            className="max-w-[80%] break-all px-4 text-center font-mono text-[11px] text-gray-400"
            aria-hidden="true"
          >
            {image.src}
          </p>
        </div>
      ) : (
        /* Zoom wrapper — scales the img toward the focal point; the outer
           overflow-hidden clips the scaled content cleanly. */
        <div
          className="h-full w-full"
          style={
            zoom !== 1
              ? { transform: `scale(${zoom})`, transformOrigin: origin }
              : undefined
          }
        >
          <img
            src={image.src}
            alt={image.alt}
            className="h-full w-full object-cover transition-transform duration-700 ease-out hover:scale-[1.02]"
            style={{ objectPosition: origin }}
            onError={() => setFailed(true)}
          />
        </div>
      )}
    </div>
  );
};

/** Full-width gallery row — single image (or video), 560px tall on desktop. */
const FullRow = ({ image }: { image: ProjectImageAsset }): JSX.Element => {
  // When a video file lands in a full-image block, skip GalleryImage entirely
  // and render a native <video> at the same height as an image row.
  if (isVideoSrc(image.src)) {
    return (
      <VideoRow
        src={image.src}
        caption={image.caption}
        captionVisible={image.captionVisible}
      />
    );
  }
  return (
    <div className="flex flex-col gap-2 w-full">
      <GalleryImage image={image} className="h-[280px] w-full sm:h-[400px] lg:h-[560px]" />
      {image.captionVisible && image.caption && (
        <p
          className="text-xs text-black leading-snug"
          style={{ fontFamily: "'Geist', 'Inter', Helvetica, sans-serif" }}
        >
          {image.caption}
        </p>
      )}
    </div>
  );
};

/**
 * Two-column gallery row.
 * wide="left"  → 760 : 480 split  (~61 / 39%)
 * wide="right" → 480 : 760 split  (~39 / 61%)
 * On mobile both columns stack vertically (450px each).
 *
 * Each slot may carry a `mediaType` of 'image' (default) or 'video'. When a
 * slot is 'video', its `src` is rendered as an HTML5 <video> element at the
 * same fixed height as an image slot — no change to column proportions or gaps.
 */
const SplitRow = ({
  left,
  right,
  wide,
}: {
  left: ProjectImageAsset;
  right: ProjectImageAsset;
  wide: "left" | "right";
}): JSX.Element => {
  // Flex-basis values mirror the Figma pixel widths (760 + 40px gap + 480 = 1280)
  const leftBasis = wide === "left" ? "flex-[760]" : "flex-[480]";
  const rightBasis = wide === "left" ? "flex-[480]" : "flex-[760]";

  const slotClassName = "h-[300px] w-full sm:h-[400px] lg:h-[500px]";

  /** Renders the media element for one slot — image or video. */
  const renderSlotMedia = (slot: ProjectImageAsset): JSX.Element => {
    if (slot.mediaType === "video") {
      return (
        <div className={`overflow-hidden rounded-[4px] ${slotClassName}`}>
          <video
            src={slot.src}
            controls
            playsInline
            className="w-full h-full object-cover"
            style={{ display: "block" }}
          >
            Your browser does not support HTML5 video.
          </video>
        </div>
      );
    }
    return <GalleryImage image={slot} className={slotClassName} />;
  };

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:gap-10">
      <div className={`flex flex-col gap-2 ${leftBasis}`}>
        {renderSlotMedia(left)}
        {left.captionVisible && left.caption && (
          <p
            className="text-xs text-black leading-snug"
            style={{ fontFamily: "'Geist', 'Inter', Helvetica, sans-serif" }}
          >
            {left.caption}
          </p>
        )}
      </div>
      <div className={`flex flex-col gap-2 ${rightBasis}`}>
        {renderSlotMedia(right)}
        {right.captionVisible && right.caption && (
          <p
            className="text-xs text-black leading-snug"
            style={{ fontFamily: "'Geist', 'Inter', Helvetica, sans-serif" }}
          >
            {right.caption}
          </p>
        )}
      </div>
    </div>
  );
};

/**
 * Full-width video row — responsive HTML5 video with controls.
 * Renders the supplied src as a native <video> element; shows a caption
 * below when captionVisible is true. Falls back to a plain message if the
 * browser cannot play the format.
 */
const VideoRow = ({
  src,
  caption,
  captionVisible,
}: {
  src: string;
  caption?: string;
  captionVisible?: boolean;
}): JSX.Element => (
  <div className="flex flex-col gap-2 w-full">
    <div className="overflow-hidden rounded-[4px] w-full h-[280px] sm:h-[400px] lg:h-[560px]">
      <video
        src={src}
        controls
        playsInline
        className="w-full h-full object-cover"
        style={{ display: "block" }}
      >
        Your browser does not support HTML5 video.
      </video>
    </div>
    {captionVisible && caption && (
      <p
        className="text-xs text-black leading-snug"
        style={{ fontFamily: "'Geist', 'Inter', Helvetica, sans-serif" }}
      >
        {caption}
      </p>
    )}
  </div>
);

/**
 * Inline text rows — narrative paragraphs that an editor inserted between
 * image rows through the CMS text block. Styled to match the body copy in
 * ProjectNarrativeSection so prose sits comfortably alongside photography.
 */
const TextRow = ({ paragraphs }: { paragraphs: string[] }): JSX.Element => (
  <div className="flex flex-col gap-5 lg:max-w-[760px]">
    {paragraphs
      .filter((p) => p.trim().length > 0)
      .map((paragraph, i) => (
        <p
          key={i}
          className="font-normal leading-[1.65] text-[#0d0d1a]"
          style={{
            fontFamily: "'Geist', 'Inter', Helvetica, sans-serif",
            fontSize: "16px",
          }}
        >
          {paragraph}
        </p>
      ))}
  </div>
);

/**
 * Renders the full gallery section from a typed array of `GalleryBlock`.
 * Supports three block types: full-image, split-image, and inline text.
 * Matches the Figma `project-gallery` frame: px-80, pt-48, pb-120, gap-40 between rows.
 */
export const ProjectGallerySection = ({
  blocks,
}: ProjectGallerySectionProps): JSX.Element => {
  return (
    <section className="w-full px-6 pb-16 pt-10 sm:px-10 sm:pb-24 sm:pt-12 lg:px-20 lg:pb-32 lg:pt-12">
      <ContainerLayout className="flex flex-col gap-4 sm:gap-6 lg:gap-10">
      {blocks.map((block, i) => {
        if (block.type === "full") {
          return <FullRow key={i} image={block.image} />;
        }
        if (block.type === "text") {
          return <TextRow key={i} paragraphs={block.paragraphs} />;
        }
        if (block.type === "video") {
          return (
            <VideoRow
              key={i}
              src={block.src}
              caption={block.caption}
              captionVisible={block.captionVisible}
            />
          );
        }
        return (
          <SplitRow
            key={i}
            left={block.left}
            right={block.right}
            wide={block.wide}
          />
        );
      })}
      </ContainerLayout>
    </section>
  );
};
