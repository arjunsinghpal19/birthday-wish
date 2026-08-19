/**
 * ============================================================================
 * PHASE 31A AUTOMATED TEST SUITE: REAL DELETE + REAL DUPLICATE
 * Validates real Supabase DB deletion, real UUID duplication, system config row
 * protection, media preservation by reference, zero Storage deletions, and state synchronization.
 * ============================================================================
 */

const assert = require("assert");
const fs = require("fs");
const path = require("path");

console.log("============================================================");
console.log("🚀 STARTING PHASE 31A REAL DELETE & REAL DUPLICATE TEST SUITE");
console.log("============================================================");

// Setup lightweight DOM and Browser mock environment
globalThis.window = globalThis;
globalThis.document = {
  getElementById: (id) => null,
  querySelectorAll: (selector) => [],
  addEventListener: () => {}
};
globalThis.sessionStorage = {
  getItem: (key) => "true",
  setItem: () => {},
  removeItem: () => {}
};
globalThis.localStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {}
};

// Mock StorageModule to ensure deleteWish NEVER touches Storage assets
let storageDeleteCalled = false;
globalThis.StorageModule = {
  deleteMedia: () => {
    storageDeleteCalled = true;
    return Promise.resolve(true);
  },
  deleteMultipleMedia: () => {
    storageDeleteCalled = true;
    return Promise.resolve(true);
  }
};

// 1. Load DatabaseModule
require(path.join(__dirname, "../js/database.js"));
const dbModule = globalThis.DatabaseModule;

assert(dbModule, "DatabaseModule must be loaded and attached to window");

let testCount = 0;
function test(name, fn) {
  testCount++;
  try {
    fn();
    console.log(`  ✓ ${testCount}. ${name}`);
  } catch (err) {
    console.error(`  ✗ ${testCount}. ${name}`);
    console.error(`    Error: ${err.message}`);
    throw err;
  }
}

async function asyncTest(name, fn) {
  testCount++;
  try {
    await fn();
    console.log(`  ✓ ${testCount}. ${name}`);
  } catch (err) {
    console.error(`  ✗ ${testCount}. ${name}`);
    console.error(`    Error: ${err.message}`);
    throw err;
  }
}

(async function runAllTests() {
  // ------------------------------------------------------------
  // TEST 1: DatabaseModule API Surface
  // ------------------------------------------------------------
  test("DatabaseModule exports real deleteWish and duplicateWish functions", () => {
    assert.strictEqual(typeof dbModule.deleteWish, "function", "deleteWish must be a function");
    assert.strictEqual(typeof dbModule.duplicateWish, "function", "duplicateWish must be a function");
    assert.strictEqual(typeof dbModule.saveWish, "function", "saveWish must be a function");
    assert.strictEqual(typeof dbModule.updateWish, "function", "updateWish must be a function");
    assert.strictEqual(typeof dbModule.getWishById, "function", "getWishById must be a function");
  });

  // ------------------------------------------------------------
  // TEST 2: System Config Row Protection (00000000-0000-0000-0000-000000000001)
  // ------------------------------------------------------------
  await asyncTest("deleteWish strictly rejects system configuration UUID", async () => {
    const sysUuid = "00000000-0000-0000-0000-000000000001";
    const res = await dbModule.deleteWish(sysUuid);
    assert.strictEqual(res.success, false, "System row deletion must return success: false");
    assert(res.error.includes("system configuration"), "Error must clearly identify protected system row");
  });

  await asyncTest("duplicateWish strictly rejects system configuration UUID", async () => {
    const sysUuid = "00000000-0000-0000-0000-000000000001";
    const res = await dbModule.duplicateWish(sysUuid);
    assert.strictEqual(res.success, false, "System row duplication must return success: false");
    assert(res.error.includes("system configuration"), "Error must clearly identify protected system row");
  });

  await asyncTest("deleteWish and duplicateWish reject null, empty or invalid IDs", async () => {
    const resDel = await dbModule.deleteWish("");
    assert.strictEqual(resDel.success, false, "Empty ID delete must fail");
    const resDup = await dbModule.duplicateWish(null);
    assert.strictEqual(resDup.success, false, "Null ID duplicate must fail");
  });

  // ------------------------------------------------------------
  // TEST 3: Mock Supabase Client Integration for Delete & Duplicate
  // ------------------------------------------------------------
  let lastDeletedId = null;
  let lastInsertedRecord = null;
  const mockExistingWish = {
    id: "a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d",
    recipient_name: "Shivam Sharma",
    sender_name: "Arjun Singh",
    pass_code: "5678",
    birth_date: { year: 2001, month: 8, day: 17 },
    letter_lines: ["Line 1", "Line 2", "Line 3"],
    memory_text: "Unforgettable birthday trip!",
    reasons_json: [{ icon: "✨", title: "Kindness", text: "Great heart" }],
    wishes_json: ["Best year ahead!", "Stay awesome!"],
    gallery_json: [{ image: "https://supabase.co/storage/v1/object/public/wish-media/photos/p1.jpg", emoji: "🎈", cap: "Day out", secretNote: "Vibes" }],
    timeline_json: [{ icon: "👶", date: "2001", title: "Born", text: "Legend born" }],
    gift_json: { message: "Enjoy your gift!", coupon: "VIP-PASS" },
    music_url: "https://supabase.co/storage/v1/object/public/wish-media/audio/track1.mp3#bw-start=45",
    video_url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ#bw-start=15",
    cake_flavor: "chocolate",
    letter_font: "handwriting",
    letter_theme: "midnight"
  };

  // Mock fetch for secure Admin Delete API
  globalThis.fetch = async (url, opts = {}) => {
    const urlStr = String(url);
    if (urlStr.includes("/api/admin-delete-wish")) {
      const body = JSON.parse(opts.body || "{}");
      lastDeletedId = body.uuid;
      return {
        ok: true,
        status: 200,
        json: async () => ({ success: true, id: body.uuid }),
        text: async () => JSON.stringify({ success: true, id: body.uuid })
      };
    }
    return { ok: false, status: 404, json: async () => ({ error: "Not found" }) };
  };

  globalThis.SupabaseModule = {
    getClient: () => ({
      from: (table) => {
        assert.strictEqual(table, "wishes", "Must query 'wishes' table");
        return {
          delete: () => {
            throw new Error("Direct client-side Supabase DELETE must NEVER be called!");
          },
          select: (cols) => ({
            eq: (col, val) => ({
              single: () => {
                if (val === mockExistingWish.id) {
                  return Promise.resolve({ data: mockExistingWish, error: null });
                }
                return Promise.resolve({ data: null, error: { message: "Row not found" } });
              }
            })
          }),
          insert: (records) => {
            lastInsertedRecord = records[0];
            const generatedUuid = "f9e8d7c6-b5a4-4321-ba98-76543210fedc";
            return {
              select: () => ({
                single: () => Promise.resolve({ data: { id: generatedUuid }, error: null })
              })
            };
          }
        };
      }
    })
  };

  await asyncTest("deleteWish executes secure server-side Admin Delete API", async () => {
    lastDeletedId = null;
    storageDeleteCalled = false;
    const res = await dbModule.deleteWish(mockExistingWish.id);
    assert.strictEqual(res.success, true, "Delete should succeed");
    assert.strictEqual(lastDeletedId, mockExistingWish.id, "Admin Delete API must be invoked with target wish UUID");
  });

  test("deleteWish does NOT invoke Storage deletion (wish-media remains untouched)", () => {
    assert.strictEqual(storageDeleteCalled, false, "StorageModule.deleteMedia must NOT be invoked on wish deletion");
  });

  await asyncTest("duplicateWish fetches existing wish, creates real UUID, and appends '(Copy)'", async () => {
    lastInsertedRecord = null;
    const res = await dbModule.duplicateWish(mockExistingWish.id);
    assert.strictEqual(res.success, true, "Duplicate should succeed");
    assert.strictEqual(res.newId, "f9e8d7c6-b5a4-4321-ba98-76543210fedc", "Must return a real generated UUID");
    assert(!res.newId.startsWith("dup-"), "Must NOT return a mock 'dup-xxx' ID");

    // Verify cloned record details
    assert.strictEqual(lastInsertedRecord.recipient_name, "Shivam Sharma (Copy)", "Recipient name must append '(Copy)'");
    assert.strictEqual(lastInsertedRecord.sender_name, "Arjun Singh", "Sender name preserved");
    assert.strictEqual(lastInsertedRecord.pass_code, "5678", "Passcode preserved");
    assert.deepStrictEqual(lastInsertedRecord.birth_date, { year: 2001, month: 8, day: 17 }, "Birthdate preserved");
    assert.deepStrictEqual(lastInsertedRecord.letter_lines, ["Line 1", "Line 2", "Line 3"], "Letter lines preserved");
    assert.strictEqual(lastInsertedRecord.memory_text, "Unforgettable birthday trip!", "Memory preserved");
    assert.deepStrictEqual(lastInsertedRecord.reasons_json, mockExistingWish.reasons_json, "Reasons JSON preserved");
    assert.deepStrictEqual(lastInsertedRecord.wishes_json, mockExistingWish.wishes_json, "Wishes JSON preserved");
    assert.deepStrictEqual(lastInsertedRecord.gallery_json, mockExistingWish.gallery_json, "Gallery JSON preserved");
    assert.deepStrictEqual(lastInsertedRecord.timeline_json, mockExistingWish.timeline_json, "Timeline JSON preserved");
    assert.deepStrictEqual(lastInsertedRecord.gift_json, mockExistingWish.gift_json, "Gift JSON preserved");
    assert.strictEqual(lastInsertedRecord.cake_flavor, "chocolate", "Cake flavor preserved");
    assert.strictEqual(lastInsertedRecord.letter_font, "handwriting", "Letter font preserved");
    assert.strictEqual(lastInsertedRecord.letter_theme, "midnight", "Letter theme preserved");
  });

  await asyncTest("duplicateWish preserves media URLs by reference (no physical duplication)", async () => {
    assert.strictEqual(
      lastInsertedRecord.music_url,
      "https://supabase.co/storage/v1/object/public/wish-media/audio/track1.mp3#bw-start=45",
      "Music URL and start-time fragment preserved by reference"
    );
    assert.strictEqual(
      lastInsertedRecord.video_url,
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ#bw-start=15",
      "YouTube video URL and start-time fragment preserved by reference"
    );
    assert.strictEqual(
      lastInsertedRecord.gallery_json[0].image,
      "https://supabase.co/storage/v1/object/public/wish-media/photos/p1.jpg",
      "Gallery photo URL preserved by reference"
    );
  });

  // ------------------------------------------------------------
  // TEST 4: AdminWishes Module Real Action Synchronization
  // ------------------------------------------------------------
  globalThis.AdminCore = {
    showToast: (msg) => {},
    copyWishUrl: (url) => {}
  };

  require(path.join(__dirname, "../js/admin/admin-wishes.js"));
  const adminWishes = globalThis.AdminWishes;
  assert(adminWishes, "AdminWishes module must be loaded");

  test("admin-wishes.js does NOT contain mock dup- Date.now() ID generation", () => {
    const adminWishesCode = fs.readFileSync(path.join(__dirname, "../js/admin/admin-wishes.js"), "utf8");
    assert(!adminWishesCode.includes('dup-" + Date.now()'), "Mock dup- ID generator must be completely removed");
  });

  await asyncTest("admin-wishes.js deleteWish prompts confirmation and handles success", async () => {
    let hookEvent = null;
    let hookId = null;
    globalThis.confirm = () => true;

    adminWishes.init((event, desc, id) => {
      hookEvent = event;
      hookId = id;
    });

    adminWishes.setWishes([mockExistingWish]);
    await adminWishes.deleteWish(mockExistingWish.id);

    assert.strictEqual(hookEvent, "WISH_DELETED", "Delete must trigger WISH_DELETED state change hook");
    assert.strictEqual(hookId, mockExistingWish.id, "Hook must pass deleted wish UUID");
  });

  await asyncTest("admin-wishes.js duplicateWish invokes DatabaseModule and triggers refresh hook", async () => {
    let hookEvent = null;
    let hookId = null;

    adminWishes.init((event, desc, id) => {
      hookEvent = event;
      hookId = id;
    });

    adminWishes.setWishes([mockExistingWish]);
    await adminWishes.duplicateWish(mockExistingWish.id);

    assert.strictEqual(hookEvent, "WISH_DUPLICATED", "Duplicate must trigger WISH_DUPLICATED state change hook");
    assert.strictEqual(hookId, "f9e8d7c6-b5a4-4321-ba98-76543210fedc", "Hook must pass real generated UUID");
  });

  await asyncTest("admin-wishes.js rejects system config UUID on delete and duplicate", async () => {
    const sysUuid = "00000000-0000-0000-0000-000000000001";
    let hookTriggered = false;

    adminWishes.init(() => {
      hookTriggered = true;
    });

    await adminWishes.deleteWish(sysUuid);
    assert.strictEqual(hookTriggered, false, "System row delete must not trigger state hook");

    await adminWishes.duplicateWish(sysUuid);
    assert.strictEqual(hookTriggered, false, "System row duplicate must not trigger state hook");
  });

  console.log("\n============================================================");
  console.log(`🎉 ALL ${testCount} PHASE 31A TESTS PASSED SUCCESSFULLY!`);
  console.log("============================================================\n");
})();
