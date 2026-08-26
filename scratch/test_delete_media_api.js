import { verifyAdminSessionToken, loadLocalEnv, createAdminSessionToken } from "../api/session.js";

loadLocalEnv();

const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.SUPABASE_SERVICE_ROLE_KEY.trim();
const supabaseUrl = (process.env.SUPABASE_URL && process.env.SUPABASE_URL.trim()) || "https://dvacxeooaqxwldszqpek.supabase.co";
const BUCKET_NAME = "wish-media";
const SYSTEM_CONFIG_UUID = "00000000-0000-0000-0000-000000000001";

async function testFullFlow() {
  console.log("=== TESTING FULL STORAGE DELETE & RESCAN FLOW ===");

  // 1. Fetch secRow to create valid admin token
  const fetchRes = await fetch(
    `${supabaseUrl}/rest/v1/wishes?id=eq.${SYSTEM_CONFIG_UUID}&select=admin_password_hash,admin_password_salt,pass_code,memory_text`,
    {
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`
      }
    }
  );
  const records = await fetchRes.json();
  const secRow = records[0] || {};
  const adminToken = createAdminSessionToken(secRow);
  console.log("Admin token generated:", adminToken.substring(0, 20) + "...");

  // 2. Upload a test file to wish-media/photos/
  const testFileName = `photos/uat_test_${Date.now()}.png`;
  console.log("\n1. Uploading test file:", testFileName);
  const uploadRes = await fetch(`${supabaseUrl}/storage/v1/object/${BUCKET_NAME}/${testFileName}`, {
    method: "POST",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "image/png",
      "x-upsert": "true"
    },
    body: "fake image payload"
  });
  console.log("Upload status:", uploadRes.status);

  // 3. Verify it appears in fresh storage list
  const listRes1 = await fetch(`${supabaseUrl}/storage/v1/object/list/${BUCKET_NAME}`, {
    method: "POST",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ prefix: "photos", limit: 100 })
  });
  const list1 = await listRes1.json();
  const inList1 = list1.some(f => testFileName.endsWith(f.name));
  console.log("2. Verified in Storage listing before deletion:", inList1);
  if (!inList1) throw new Error("Test file not listed after upload!");

  // 4. Delete via Service Role API endpoint logic
  console.log("\n3. Deleting test file via Service Role delete...");
  const delRes = await fetch(`${supabaseUrl}/storage/v1/object/${BUCKET_NAME}`, {
    method: "DELETE",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ prefixes: [testFileName] })
  });
  const delData = await delRes.json();
  console.log("Delete status:", delRes.status);
  console.log("Delete response data:", delData);

  // 5. Verify it is ABSENT from fresh storage list
  const listRes2 = await fetch(`${supabaseUrl}/storage/v1/object/list/${BUCKET_NAME}`, {
    method: "POST",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ prefix: "photos", limit: 100 })
  });
  const list2 = await listRes2.json();
  const inList2 = list2.some(f => testFileName.endsWith(f.name));
  console.log("4. Verified in Storage listing after deletion:", inList2);

  if (inList2) {
    throw new Error("FAILED: File still exists in Storage listing after deletion!");
  } else {
    console.log("\n✅ SUCCESS: File was permanently removed and remains absent from fresh storage listings!");
  }
}

testFullFlow().catch(e => {
  console.error("Test error:", e);
  process.exit(1);
});
