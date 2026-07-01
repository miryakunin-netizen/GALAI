export async function extractTxt(buffer) {
  return {
    text: buffer.toString("utf8"),
    pages: 1,
    info: {}
  };
}
