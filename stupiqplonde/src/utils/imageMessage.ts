export const fileImage = "__IMAGE__:";

export function isImageMessage(body: string): boolean {
  return body.startsWith(fileImage);
}

export function getImagePath(body: string): string {
  return body.slice(fileImage.length);
}
