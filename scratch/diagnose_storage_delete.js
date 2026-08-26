const SUPABASE_URL = "https://dvacxeooaqxwldszqpek.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_UZ1WSWZHyaij07xleBgSxw_YBn7-lAx";
const BUCKET_NAME = "wish-media";

async function runDiagnostic() {
  console.log("=== SUPABASE STORAGE REST API DIAGNOSTIC ===");
  console.log("URL:", SUPABASE_URL);
  console.log("Bucket:", BUCKET_NAME);

  const headers = {
    "apikey": SUPABASE_ANON_KEY,
    "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
    "Content-Type": "application/json"
  };

  // 1. List folders
  for (const folder of ["photos", "videos", "audio"]) {
    const listRes = await fetch(`${SUPABASE_URL}/storage/v1/object/list/${BUCKET_NAME}`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        prefix: folder,
        limit: 100,
        sortBy: { column: "created_at", order: "desc" }
      })
    });
    
    const listData = await listRes.json();
    console.log(`\nFolder [${folder}] Status: ${listRes.status}`);
    if (Array.isArray(listData)) {
      console.log(`Files count: ${listData.length}`);
      listData.forEach(item => {
        console.log(`  - name: "${item.name}", size: ${item.metadata?.size || item.size}`);
      });
    } else {
      console.log("Response:", listData);
    }
  }

  // 2. Test upload a dummy disposable file
  const testFileName = `photos/test_diagnostic_${Date.now()}.txt`;
  console.log("\n--- Testing Upload of Disposable File ---", testFileName);
  
  const uploadRes = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET_NAME}/${testFileName}`, {
    method: "POST",
    headers: {
      "apikey": SUPABASE_ANON_KEY,
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "text/plain",
      "x-upsert": "true"
    },
    body: "test file content for deletion diagnostic"
  });
  
  const uploadData = await uploadRes.json();
  console.log(`Upload Status: ${uploadRes.status}`, uploadData);

  // 3. List photos to verify it's there
  const listRes1 = await fetch(`${SUPABASE_URL}/storage/v1/object/list/${BUCKET_NAME}`, {
    method: "POST",
    headers,
    body: JSON.stringify({ prefix: "photos", limit: 100 })
  });
  const list1 = await listRes1.json();
  const existsInList1 = Array.isArray(list1) && list1.some(f => testFileName.endsWith(f.name));
  console.log("Exists in list after upload?", existsInList1);

  // 4. Try DELETE with prefixes: ['photos/test_diagnostic_...']
  console.log("\n--- Attempting DELETE /storage/v1/object/" + BUCKET_NAME + " with prefixes: ['" + testFileName + "'] ---");
  const deleteRes1 = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET_NAME}`, {
    method: "DELETE",
    headers,
    body: JSON.stringify({ prefixes: [testFileName] })
  });
  const deleteData1 = await deleteRes1.json();
  console.log(`Delete Status: ${deleteRes1.status}`);
  console.log("Delete Response body:", deleteData1);

  // 5. List photos again to verify if it was actually deleted
  const listRes2 = await fetch(`${SUPABASE_URL}/storage/v1/object/list/${BUCKET_NAME}`, {
    method: "POST",
    headers,
    body: JSON.stringify({ prefix: "photos", limit: 100 })
  });
  const list2 = await listRes2.json();
  const existsInList2 = Array.isArray(list2) && list2.some(f => testFileName.endsWith(f.name));
  console.log("Exists in list after delete1?", existsInList2);

  // 6. What if path was without 'photos/' prefix?
  if (existsInList2) {
    const bareName = testFileName.replace("photos/", "");
    console.log("\n--- Attempting DELETE with prefixes: ['" + bareName + "'] ---");
    const deleteRes2 = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET_NAME}`, {
      method: "DELETE",
      headers,
      body: JSON.stringify({ prefixes: [bareName] })
    });
    const deleteData2 = await deleteRes2.json();
    console.log(`Delete Status: ${deleteRes2.status}`);
    console.log("Delete Response body:", deleteData2);

    const listRes3 = await fetch(`${SUPABASE_URL}/storage/v1/object/list/${BUCKET_NAME}`, {
      method: "POST",
      headers,
      body: JSON.stringify({ prefix: "photos", limit: 100 })
    });
    const list3 = await listRes3.json();
    const existsInList3 = Array.isArray(list3) && list3.some(f => testFileName.endsWith(f.name));
    console.log("Exists in list after delete2?", existsInList3);
  }
}

runDiagnostic().catch(err => {
  console.error("Diagnostic error:", err);
});
