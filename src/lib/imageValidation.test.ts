import { describe, it, expect } from "vitest";
import { validateLogoUpload } from "./imageValidation";

function makePng(width: number, height: number): Buffer {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(25); // 4 length + 4 "IHDR" + 4 width + 4 height + 9 padding
  ihdr.writeUInt32BE(13, 0);
  ihdr.write("IHDR", 4);
  ihdr.writeUInt32BE(width, 8);
  ihdr.writeUInt32BE(height, 12);
  return Buffer.concat([signature, ihdr]);
}

describe("validateLogoUpload", () => {
  it("accepts a valid small PNG", () => {
    const result = validateLogoUpload(makePng(128, 128));
    expect(result).toEqual({ mimeType: "image/png", width: 128, height: 128 });
  });

  it("rejects a file that isn't PNG or JPEG", () => {
    expect(() => validateLogoUpload(Buffer.from("not an image"))).toThrow(/Unsupported file type/);
  });

  it("rejects an empty buffer", () => {
    expect(() => validateLogoUpload(Buffer.alloc(0))).toThrow(/Empty file/);
  });

  it("rejects a PNG that is too large in pixel dimensions", () => {
    expect(() => validateLogoUpload(makePng(4000, 4000))).toThrow(/exceeds/);
  });

  it("rejects a PNG that is too small", () => {
    expect(() => validateLogoUpload(makePng(2, 2))).toThrow(/too small/);
  });

  it("rejects a file over the size limit even if the header looks valid", () => {
    const huge = Buffer.concat([makePng(64, 64), Buffer.alloc(3 * 1024 * 1024)]);
    expect(() => validateLogoUpload(huge)).toThrow(/exceeds/);
  });

  it("does not trust a renamed non-image file (magic byte check, not extension)", () => {
    // A text file that merely happens to end up here without a real PNG/JPEG header.
    const fakeImage = Buffer.from("<script>alert(1)</script>");
    expect(() => validateLogoUpload(fakeImage)).toThrow(/Unsupported file type/);
  });
});
