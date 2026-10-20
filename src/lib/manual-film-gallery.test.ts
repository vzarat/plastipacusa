import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  HAND_FILM_BOX_IMAGE_URL,
  HAND_FILM_SPEC_SHEET_IMAGE_URL,
  manualFilmGallery,
  STRETCH_FILM_PLACEHOLDER,
} from "./products";

describe("manual film gallery", () => {
  it("keeps the stored roll photo first, then the carton and the spec sheet", () => {
    const roll = "https://cdn.example.com/force-18-roll.png";
    const gallery = manualFilmGallery([
      HAND_FILM_BOX_IMAGE_URL,
      roll,
      "https://cdn.example.com/extra.png",
    ]);
    assert.deepEqual(gallery, [roll, HAND_FILM_BOX_IMAGE_URL, HAND_FILM_SPEC_SHEET_IMAGE_URL]);
  });

  it("uses the roll placeholder when every stored image is a carton or a spec sheet", () => {
    const gallery = manualFilmGallery([HAND_FILM_BOX_IMAGE_URL, HAND_FILM_SPEC_SHEET_IMAGE_URL]);
    assert.equal(gallery[0], STRETCH_FILM_PLACEHOLDER);
    assert.equal(gallery.length, 3);
  });
});
