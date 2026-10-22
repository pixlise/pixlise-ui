import { WalkthroughPlacement } from "../models/walkthrough";

export type Box = { top: number; left: number; width: number; height: number };
export type Point = { x: number; y: number };
export type Arrow = { x1: number; y1: number; x2: number; y2: number; head: string };

const ARROW_HEAD_SIZE = 8;
const MIN_ARROW_LENGTH = 12;

const lerp = (from: number, to: number, progress: number): number => from + (to - from) * progress;

export const lerpBox = (from: Box, to: Box, progress: number): Box => ({
  top: lerp(from.top, to.top, progress),
  left: lerp(from.left, to.left, progress),
  width: lerp(from.width, to.width, progress),
  height: lerp(from.height, to.height, progress),
});

export const easeInOut = (progress: number): number => (progress < 0.5 ? 4 * progress ** 3 : 1 - (-2 * progress + 2) ** 3 / 2);

export const toBox = (rect: DOMRect): Box => ({ top: rect.top, left: rect.left, width: rect.width, height: rect.height });

export const padBox = (box: Box, padding: number): Box => ({
  top: box.top - padding,
  left: box.left - padding,
  width: box.width + padding * 2,
  height: box.height + padding * 2,
});

export const getCenter = (box: Box): Point => ({ x: box.left + box.width / 2, y: box.top + box.height / 2 });

// Card goes on the placement side of all the boxes, centred on the middle of them
export const getCardBox = (boxes: Box[], card: { width: number; height: number }, placement: WalkthroughPlacement, offset: number, margin: number): Box => {
  const left = Math.min(...boxes.map(box => box.left));
  const top = Math.min(...boxes.map(box => box.top));
  const right = Math.max(...boxes.map(box => box.left + box.width));
  const bottom = Math.max(...boxes.map(box => box.top + box.height));
  const centers = boxes.map(getCenter);
  const center = { x: centers.reduce((sum, point) => sum + point.x, 0) / centers.length, y: centers.reduce((sum, point) => sum + point.y, 0) / centers.length };

  let cardTop = bottom + offset;
  let cardLeft = center.x - card.width / 2;
  switch (placement) {
    case "top":
      cardTop = top - offset - card.height;
      break;
    case "left":
      cardTop = center.y - card.height / 2;
      cardLeft = left - offset - card.width;
      break;
    case "right":
      cardTop = center.y - card.height / 2;
      cardLeft = right + offset;
      break;
  }

  return {
    top: Math.max(margin, Math.min(cardTop, window.innerHeight - card.height - margin)),
    left: Math.max(margin, Math.min(cardLeft, window.innerWidth - card.width - margin)),
    width: card.width,
    height: card.height,
  };
};

// Where a line from the box centre towards a point leaves the box
const getEdgePoint = (box: Box, toward: Point): Point => {
  const center = getCenter(box);
  const dx = toward.x - center.x;
  const dy = toward.y - center.y;
  const scale = Math.max(Math.abs(dx) / (box.width / 2 || 1), Math.abs(dy) / (box.height / 2 || 1));
  return scale === 0 ? center : { x: center.x + dx / scale, y: center.y + dy / scale };
};

export const getArrow = (cardBox: Box, targetBox: Box): Arrow | null => {
  const from = getEdgePoint(cardBox, getCenter(targetBox));
  const to = getEdgePoint(targetBox, getCenter(cardBox));
  const length = Math.hypot(to.x - from.x, to.y - from.y);
  if (length < MIN_ARROW_LENGTH) {
    return null;
  }

  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  const corner = (offset: number): string =>
    `${to.x - ARROW_HEAD_SIZE * Math.cos(angle + offset)},${to.y - ARROW_HEAD_SIZE * Math.sin(angle + offset)}`;

  return { x1: from.x, y1: from.y, x2: to.x, y2: to.y, head: `${to.x},${to.y} ${corner(-Math.PI / 6)} ${corner(Math.PI / 6)}` };
};

// Full screen rectangle with a hole per box (even-odd fill)
export const getBackdropPath = (holes: Box[]): string =>
  [
    `M0 0H${window.innerWidth}V${window.innerHeight}H0Z`,
    ...holes.map(hole => `M${hole.left} ${hole.top}h${hole.width}v${hole.height}h${-hole.width}Z`),
  ].join("");
