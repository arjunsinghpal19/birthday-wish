import { loadLocalEnv } from "../api/_session.js";

loadLocalEnv();

const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.SUPABASE_SERVICE_ROLE_KEY.trim();
const supabaseUrl = (process.env.SUPABASE_URL && process.env.SUPABASE_URL.trim()) || "https://dvacxeooaqxwldszqpek.supabase.co";
const BUCKET_NAME = "wish-media";

console.log("Service role key exists?", !!serviceRoleKey);
console.log("Supabase URL:", supabaseUrl);

async function testServiceRoleDelete() {
  const headers = {
    "apikey": serviceRoleKey,
    "Authorization": `Bearer ${serviceRoleKey}`,
    "Content-Type": "application/json"
  };

  // Check if photos/test_diagnostic_1787387635580.txt is still in storage
  const listRes = await fetch(`${supabaseUrl}/storage/v1/object/list/${BUCKET_NAME}`, {
    method: "POST",
    headers,
    body: JSON.stringify({ prefix: "photos", limit: 100 })
  });
  const listData = await listRes.json();
  const targetFile = listData.find(f => f.name.includes("test_diagnostic"));
  console.log("Target test file in list:", targetFile);

  if (targetFile) {
    const pathToDelete = `photos/${targetFile.name}`;
    console.log("Deleting via Service Role key with prefixes: ['" + pathToDelete + "']");
    const delRes = await fetch(`${supabaseUrl}/storage/v1/object/${BUCKET_NAME}`, {
      method: "DELETE",
      headers,
      body: JSON.stringify({ prefixes: [pathToDelete] })
    });
    const delData = await delRes.json();
    console.log("Delete status:", delRes.status);
    console.log("Delete response data:", delData);

    // List again to verify
    const listRes2 = await fetch(`${supabaseUrl}/storage/v1/object/list/${BUCKET_NAME}`, {
      method: "POST",
      headers,
      body: JSON.stringify({ prefix: "photos", limit: 100 })
    });
    const listData2 = await listRes2.json();
    const stillThere = listData2.some(f => f.name === targetFile.name);
    console.log("Target test file still in list after Service Role delete?", stillThere);
  }
}

testServiceRoleDelete().catch(e => console.error(e));
