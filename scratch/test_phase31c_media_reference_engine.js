/**
 * ============================================================================
 * PHASE 31C-1 DEEP MEDIA REFERENCE EXTRACTION ENGINE TEST SUITE
 * scratch/test_phase31c_media_reference_engine.js
 *
 * Validates:
 * - Reference extraction from music_url, video_url, gallery_json, timeline_json
 * - Start-time metadata stripping (#bw-start=N)
 * - URL and path canonicalization (public, signed, relative, encoded)
 * - Safe JSON string parsing & error resilience
 * - Local and external asset exclusion
 * - Reference map construction and querying
 * - Integration with AdminMedia.loadStorageMediaData()
 * ============================================================================
 */

const fs = require("fs");
const path = require("path");
const assert = require("assert");

// Setup DOM / Window Mock
function setupEnvironment() {
  const windowMock = {
    AdminCore: {
      showToast: () => {},
      formatBytes: (bytes) => `${(bytes / (1024 * 1024)).toFixed(1)} MB`,
      copyWishUrl: () => {}
    },
    StorageModule: {
      listAllMedia: async () => []
    }
  };

  const documentMock = {
    getElementById: () => null,
    querySelectorAll: () => [],
    addEventListener: () => {}
  };

  globalThis.window = windowMock;
  globalThis.document = documentMock;

  // Load admin-media.js
  const mediaCode = fs.readFileSync(path.join(__dirname, "../js/admin/admin-media.js"), "utf8");
  const fn = new Function("window", "document", mediaCode);
  fn(windowMock, documentMock);

  return windowMock;
}

let passed = 0;
let failed = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (e) {
    console.error(`  ✗ ${name}`);
    console.error(e);
    failed++;
  }
}

console.log("============================================================");
console.log("🚀 STARTING PHASE 31C-1 DEEP MEDIA REFERENCE ENGINE TESTS");
console.log("============================================================");

const { window: win } = { window: setupEnvironment() };
const Engine = win.MediaReferenceEngine;
const AdminMedia = win.AdminMedia;

assert.ok(Engine, "MediaReferenceEngine must be exported on window");
assert.ok(AdminMedia.ReferenceEngine, "AdminMedia.ReferenceEngine must be exposed");

// Test 1: music_url with normal Supabase Storage URL
runTest("1. music_url: Extracts canonical path from standard Supabase storage URL", () => {
  const wish = {
    id: "wish-001",
    recipient_name: "Alice",
    music_url: "https://xyz.supabase.co/storage/v1/object/public/wish-media/audio/1724234567_audio.mp3"
  };
  const refs = Engine.extractReferencesFromWish(wish);
  assert.strictEqual(refs.length, 1);
  assert.strictEqual(refs[0].canonicalPath, "audio/1724234567_audio.mp3");
  assert.strictEqual(refs[0].field, "music_url");
  assert.strictEqual(refs[0].recipientName, "Alice");
});

// Test 2: music_url with #bw-start=N metadata
runTest("2. music_url: Strips #bw-start=N metadata without breaking canonical path", () => {
  const wish = {
    id: "wish-002",
    recipient_name: "Bob",
    music_url: "https://xyz.supabase.co/storage/v1/object/public/wish-media/audio/1724234567_audio.mp3#bw-start=45"
  };
  const refs = Engine.extractReferencesFromWish(wish);
  assert.strictEqual(refs.length, 1);
  assert.strictEqual(refs[0].canonicalPath, "audio/1724234567_audio.mp3");
  assert.strictEqual(refs[0].field, "music_url");
});

// Test 3: video_url with normal Storage URL
runTest("3. video_url: Extracts canonical path from standard Storage URL", () => {
  const wish = {
    id: "wish-003",
    recipient_name: "Charlie",
    video_url: "https://xyz.supabase.co/storage/v1/object/public/wish-media/videos/1724234567_clip.mp4"
  };
  const refs = Engine.extractReferencesFromWish(wish);
  assert.strictEqual(refs.length, 1);
  assert.strictEqual(refs[0].canonicalPath, "videos/1724234567_clip.mp4");
  assert.strictEqual(refs[0].field, "video_url");
});

// Test 4: video_url with #bw-start=N metadata
runTest("4. video_url: Strips #bw-start=N metadata from video storage URL", () => {
  const wish = {
    id: "wish-004",
    recipient_name: "David",
    video_url: "https://xyz.supabase.co/storage/v1/object/public/wish-media/videos/1724234567_clip.mp4#bw-start=10"
  };
  const refs = Engine.extractReferencesFromWish(wish);
  assert.strictEqual(refs.length, 1);
  assert.strictEqual(refs[0].canonicalPath, "videos/1724234567_clip.mp4");
});

// Test 5: gallery_json as JSON string
runTest("5. gallery_json: Safely parses JSON-stringified array of gallery images", () => {
  const wish = {
    id: "wish-005",
    recipient_name: "Emma",
    gallery_json: JSON.stringify([
      { id: "g1", image: "https://xyz.supabase.co/storage/v1/object/public/wish-media/photos/photo1.jpg" },
      { id: "g2", image: "https://xyz.supabase.co/storage/v1/object/public/wish-media/photos/photo2.jpg" }
    ])
  };
  const refs = Engine.extractReferencesFromWish(wish);
  assert.strictEqual(refs.length, 2);
  assert.strictEqual(refs[0].canonicalPath, "photos/photo1.jpg");
  assert.strictEqual(refs[1].canonicalPath, "photos/photo2.jpg");
});

// Test 6: gallery_json as parsed array
runTest("6. gallery_json: Handles pre-parsed object array", () => {
  const wish = {
    id: "wish-006",
    recipient_name: "Frank",
    gallery_json: [
      { id: "g1", image: "photos/sample_a.jpg" },
      { id: "g2", image: "photos/sample_b.jpg" }
    ]
  };
  const refs = Engine.extractReferencesFromWish(wish);
  assert.strictEqual(refs.length, 2);
  assert.strictEqual(refs[0].canonicalPath, "photos/sample_a.jpg");
  assert.strictEqual(refs[1].canonicalPath, "photos/sample_b.jpg");
});

// Test 7: gallery object using .image
runTest("7. gallery object: Extracts from .image property", () => {
  const wish = {
    id: "wish-007",
    gallery_json: [{ image: "https://xyz.supabase.co/storage/v1/object/public/wish-media/photos/pic_image.png" }]
  };
  const refs = Engine.extractReferencesFromWish(wish);
  assert.strictEqual(refs.length, 1);
  assert.strictEqual(refs[0].canonicalPath, "photos/pic_image.png");
});

// Test 8: gallery object using .url
runTest("8. gallery object: Extracts from .url property", () => {
  const wish = {
    id: "wish-008",
    gallery_json: [{ url: "https://xyz.supabase.co/storage/v1/object/public/wish-media/photos/pic_url.png" }]
  };
  const refs = Engine.extractReferencesFromWish(wish);
  assert.strictEqual(refs.length, 1);
  assert.strictEqual(refs[0].canonicalPath, "photos/pic_url.png");
});

// Test 9: gallery object using .src
runTest("9. gallery object: Extracts from .src property", () => {
  const wish = {
    id: "wish-009",
    gallery_json: [{ src: "https://xyz.supabase.co/storage/v1/object/public/wish-media/photos/pic_src.png" }]
  };
  const refs = Engine.extractReferencesFromWish(wish);
  assert.strictEqual(refs.length, 1);
  assert.strictEqual(refs[0].canonicalPath, "photos/pic_src.png");
});

// Test 10: gallery direct string URL
runTest("10. gallery object: Extracts direct string URLs from gallery array", () => {
  const wish = {
    id: "wish-010",
    gallery_json: ["https://xyz.supabase.co/storage/v1/object/public/wish-media/photos/direct_string.png"]
  };
  const refs = Engine.extractReferencesFromWish(wish);
  assert.strictEqual(refs.length, 1);
  assert.strictEqual(refs[0].canonicalPath, "photos/direct_string.png");
});

// Test 11: timeline_json image reference
runTest("11. timeline_json: Extracts images from memory timeline entries", () => {
  const wish = {
    id: "wish-011",
    recipient_name: "Grace",
    timeline_json: JSON.stringify([
      { year: "2020", title: "College", image: "https://xyz.supabase.co/storage/v1/object/public/wish-media/photos/college.jpg" },
      { year: "2024", title: "Trip", image: "photos/trip.jpg" }
    ])
  };
  const refs = Engine.extractReferencesFromWish(wish);
  assert.strictEqual(refs.length, 2);
  assert.strictEqual(refs[0].canonicalPath, "photos/college.jpg");
  assert.strictEqual(refs[0].field, "timeline_json[0]");
  assert.strictEqual(refs[1].canonicalPath, "photos/trip.jpg");
  assert.strictEqual(refs[1].field, "timeline_json[1]");
});

// Test 12: URL encoding normalization
runTest("12. URL encoding: Decodes %20, %2F and special characters", () => {
  const rawUrl = "https://xyz.supabase.co/storage/v1/object/public/wish-media/photos/My%20Birthday%20Photo%20(2026).jpg";
  const canonical = Engine.normalizeStoragePath(rawUrl);
  assert.strictEqual(canonical, "photos/My Birthday Photo (2026).jpg");
});

// Test 13: Query and fragment stripping
runTest("13. Query & Fragments: Strips ?token=..., ?t=..., #hash cleanly", () => {
  const rawUrl = "https://xyz.supabase.co/storage/v1/object/sign/wish-media/photos/signed_img.jpg?token=secret123&exp=99999#preview";
  const canonical = Engine.normalizeStoragePath(rawUrl);
  assert.strictEqual(canonical, "photos/signed_img.jpg");
});

// Test 14: Storage URL -> canonical relative path
runTest("14. Normalization: Resolves public, signed, and relative storage paths to canonical form", () => {
  assert.strictEqual(
    Engine.normalizeStoragePath("https://proj.supabase.co/storage/v1/object/public/wish-media/photos/abc.jpg"),
    "photos/abc.jpg"
  );
  assert.strictEqual(
    Engine.normalizeStoragePath("https://proj.supabase.co/storage/v1/object/sign/wish-media/videos/clip.mp4?token=xyz"),
    "videos/clip.mp4"
  );
  assert.strictEqual(
    Engine.normalizeStoragePath("wish-media/audio/song.mp3"),
    "audio/song.mp3"
  );
  assert.strictEqual(
    Engine.normalizeStoragePath("/photos/avatar.png"),
    "photos/avatar.png"
  );
});

// Test 15: Local assets are excluded
runTest("15. Local Assets: Returns null for local repository assets and does not map to storage", () => {
  assert.strictEqual(Engine.normalizeStoragePath("assets/audio/happy-birthday.mp3"), null);
  assert.strictEqual(Engine.normalizeStoragePath("./assets/images/cake.png"), null);
  assert.strictEqual(Engine.normalizeStoragePath("/assets/icons/heart.svg"), null);
  assert.strictEqual(Engine.normalizeStoragePath("images/polaroid.jpg"), null);

  assert.strictEqual(Engine.classifyReference("assets/audio/song.mp3"), Engine.ReferenceType.LOCAL);
});

// Test 16: External URLs are excluded
runTest("16. External URLs: Returns null for YouTube, Vimeo, and non-bucket external URLs", () => {
  assert.strictEqual(Engine.normalizeStoragePath("https://www.youtube.com/watch?v=dQw4w9WgXcQ"), null);
  assert.strictEqual(Engine.normalizeStoragePath("https://youtu.be/dQw4w9WgXcQ"), null);
  assert.strictEqual(Engine.normalizeStoragePath("https://images.unsplash.com/photo-12345"), null);

  assert.strictEqual(Engine.classifyReference("https://youtube.com/watch?v=123"), Engine.ReferenceType.EXTERNAL);
});

// Test 17: Null/empty/undefined references do not crash
runTest("17. Null Safety: Gracefully handles null, undefined, numbers, booleans, and empty strings", () => {
  assert.strictEqual(Engine.normalizeStoragePath(null), null);
  assert.strictEqual(Engine.normalizeStoragePath(undefined), null);
  assert.strictEqual(Engine.normalizeStoragePath(""), null);
  assert.strictEqual(Engine.normalizeStoragePath("   "), null);
  assert.strictEqual(Engine.classifyReference(null), Engine.ReferenceType.INVALID);
  assert.deepStrictEqual(Engine.extractReferencesFromWish(null), []);
  assert.deepStrictEqual(Engine.extractReferencesFromWish({}), []);
});

// Test 18: Malformed gallery JSON does not crash the engine
runTest("18. Malformed Gallery JSON: Handles invalid JSON string gracefully without throwing", () => {
  const wish = {
    id: "wish-018",
    gallery_json: "{ malformed: json [ unbalanced"
  };
  const refs = Engine.extractReferencesFromWish(wish);
  assert.deepStrictEqual(refs, []);
});

// Test 19: Malformed timeline JSON does not crash the engine
runTest("19. Malformed Timeline JSON: Handles invalid JSON string gracefully without throwing", () => {
  const wish = {
    id: "wish-019",
    timeline_json: "{ not a valid json syntax ... }"
  };
  const refs = Engine.extractReferencesFromWish(wish);
  assert.deepStrictEqual(refs, []);
});

// Test 20: Multiple wishes referencing the same Storage file are all mapped
runTest("20. Shared Reference Mapping: Multiple wishes referencing the same storage file are all recorded", () => {
  const wishes = [
    { id: "wish-A", recipient_name: "Alice", music_url: "audio/shared_tune.mp3" },
    { id: "wish-B", recipient_name: "Bob", music_url: "https://proj.supabase.co/storage/v1/object/public/wish-media/audio/shared_tune.mp3#bw-start=12" }
  ];

  const refMap = Engine.buildReferenceMap(wishes);
  assert.strictEqual(refMap.isReferenced("audio/shared_tune.mp3"), true);
  const refs = refMap.getReferences("audio/shared_tune.mp3");
  assert.strictEqual(refs.length, 2);
  assert.strictEqual(refs[0].wishId, "wish-A");
  assert.strictEqual(refs[1].wishId, "wish-B");
});

// Test 21: One wish referencing multiple Storage files across different fields
runTest("21. Multi-Field Extraction: Single wish with music, video, gallery, and timeline extracts all files", () => {
  const wish = {
    id: "wish-full",
    recipient_name: "Zoe",
    music_url: "audio/track1.mp3#bw-start=5",
    video_url: "videos/vid1.mp4",
    gallery_json: [
      { image: "photos/gallery1.jpg" },
      { url: "photos/gallery2.jpg" }
    ],
    timeline_json: [
      { title: "Day 1", image: "photos/timeline1.jpg" }
    ]
  };

  const refs = Engine.extractReferencesFromWish(wish);
  assert.strictEqual(refs.length, 5);
  const paths = refs.map(r => r.canonicalPath);
  assert.ok(paths.includes("audio/track1.mp3"));
  assert.ok(paths.includes("videos/vid1.mp4"));
  assert.ok(paths.includes("photos/gallery1.jpg"));
  assert.ok(paths.includes("photos/gallery2.jpg"));
  assert.ok(paths.includes("photos/timeline1.jpg"));
});

// Test 22: Unreferenced Storage path remains absent from reference map
runTest("22. Unreferenced Files: isReferenced returns false and getReferences returns empty array for orphans", () => {
  const wishes = [
    { id: "wish-1", music_url: "audio/used_track.mp3" }
  ];
  const refMap = Engine.buildReferenceMap(wishes);

  assert.strictEqual(refMap.isReferenced("photos/orphan_pic.jpg"), false);
  assert.deepStrictEqual(refMap.getReferences("photos/orphan_pic.jpg"), []);
  assert.strictEqual(refMap.isReferenced("audio/used_track.mp3"), true);
});

// Test 23: Edge-case URL and path normalization
runTest("23. Edge Cases: Handles backslashes, extra slashes, uppercase bucket names, and whitespace", () => {
  assert.strictEqual(Engine.normalizeStoragePath("  photos\\sub\\pic.jpg  "), "photos/sub/pic.jpg");
  assert.strictEqual(Engine.normalizeStoragePath("///videos/video.mp4///"), "videos/video.mp4");
  assert.strictEqual(
    Engine.normalizeStoragePath("https://proj.supabase.co/storage/v1/object/public/WISH-MEDIA/photos/cake.png"),
    "photos/cake.png"
  );
});

// Test 24: Zero false positive caused by #bw-start metadata
runTest("24. Metadata Immunity: #bw-start metadata never causes a used file to appear unreferenced", () => {
  const wishes = [
    { id: "wish-hash", recipient_name: "Rahul", music_url: "https://xyz.supabase.co/storage/v1/object/public/wish-media/audio/song.mp3#bw-start=120" }
  ];
  const refMap = Engine.buildReferenceMap(wishes);

  // Storage file path as stored in Supabase
  const storageFilePath = "audio/song.mp3";
  const storageFilePublicUrl = "https://xyz.supabase.co/storage/v1/object/public/wish-media/audio/song.mp3";

  assert.strictEqual(refMap.isReferenced(storageFilePath), true);
  assert.strictEqual(refMap.isReferenced(storageFilePublicUrl), true);
});

// Test 25: AdminMedia.loadStorageMediaData integration test
runTest("25. AdminMedia Integration: loadStorageMediaData accurately maps used and unused assets", async () => {
  const mockStorageFiles = [
    { id: "p1", name: "used_photo.jpg", folder: "photos", path: "photos/used_photo.jpg", publicUrl: "https://xyz.supabase.co/storage/v1/object/public/wish-media/photos/used_photo.jpg", size: 1024 },
    { id: "p2", name: "unused_photo.jpg", folder: "photos", path: "photos/unused_photo.jpg", publicUrl: "https://xyz.supabase.co/storage/v1/object/public/wish-media/photos/unused_photo.jpg", size: 2048 },
    { id: "a1", name: "used_song.mp3", folder: "audio", path: "audio/used_song.mp3", publicUrl: "https://xyz.supabase.co/storage/v1/object/public/wish-media/audio/used_song.mp3", size: 5000 }
  ];

  win.StorageModule.listAllMedia = async () => mockStorageFiles;

  const mockWishes = [
    {
      id: "w-101",
      recipient_name: "Kavya",
      gallery_json: JSON.stringify([{ image: "photos/used_photo.jpg" }]),
      music_url: "https://xyz.supabase.co/storage/v1/object/public/wish-media/audio/used_song.mp3#bw-start=15"
    }
  ];

  const loadedFiles = await AdminMedia.load(mockWishes);
  assert.strictEqual(loadedFiles.length, 3);

  const usedPhoto = loadedFiles.find(f => f.name === "used_photo.jpg");
  assert.strictEqual(usedPhoto.isUsed, true);
  assert.strictEqual(usedPhoto.usedInName, "Kavya");
  assert.strictEqual(usedPhoto.usedInUuid, "w-101");
  assert.strictEqual(usedPhoto.references.length, 1);

  const usedSong = loadedFiles.find(f => f.name === "used_song.mp3");
  assert.strictEqual(usedSong.isUsed, true);
  assert.strictEqual(usedSong.usedInName, "Kavya");

  const unusedPhoto = loadedFiles.find(f => f.name === "unused_photo.jpg");
  assert.strictEqual(usedPhoto.canonicalPath, "photos/used_photo.jpg");
  assert.strictEqual(unusedPhoto.isUsed, false);
  assert.strictEqual(unusedPhoto.usedInName, "Unused");
  assert.strictEqual(unusedPhoto.usedInUuid, null);
  assert.strictEqual(unusedPhoto.references.length, 0);
});

// Test 26: ReferenceType classification
runTest("26. ReferenceType: Accurately classifies all 5 reference types", () => {
  assert.strictEqual(Engine.classifyReference("https://xyz.supabase.co/storage/v1/object/public/wish-media/photos/a.jpg"), Engine.ReferenceType.STORAGE);
  assert.strictEqual(Engine.classifyReference("assets/audio/song.mp3"), Engine.ReferenceType.LOCAL);
  assert.strictEqual(Engine.classifyReference("data:image/jpeg;base64,123"), Engine.ReferenceType.DATA_URL);
  assert.strictEqual(Engine.classifyReference("https://youtube.com/watch?v=123"), Engine.ReferenceType.EXTERNAL);
  assert.strictEqual(Engine.classifyReference(""), Engine.ReferenceType.INVALID);
});

// Test 27: Module freezing & immutability
runTest("27. Immutability: MediaReferenceEngine and ReferenceType are frozen", () => {
  assert.ok(Object.isFrozen(Engine), "MediaReferenceEngine should be frozen");
  assert.ok(Object.isFrozen(Engine.ReferenceType), "ReferenceType should be frozen");
});

console.log("============================================================");
console.log(`📊 PHASE 31C-1 TEST RESULTS: ${passed} Passed, ${failed} Failed`);
console.log("============================================================");

if (failed > 0) {
  process.exit(1);
} else {
  console.log(`🎉 ALL ${passed} PHASE 31C-1 TESTS PASSED SUCCESSFULLY!`);
  process.exit(0);
}
