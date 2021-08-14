// TODO: setup indexedDb connection and create an object store for saving
// transaction data when the user is offline.

const budgetVersion = 1;
let db;

const request = indexedDB.open("BudgetDB", budgetVersion);

request.onerror = function (e) {
  console.log(e.target);
  console.log(`Woops! ${e.target.errorCode}`);
};

request.onupgradeneeded = function (e) {
  console.log("Upgrade needed in IndexDB");

  const { oldVersion } = e;
  const newVersion = e.newVersion || db.version;

  console.log(`DB Updated from version ${oldVersion} to ${newVersion}`);

  db = e.target.result;

  if (db.objectStoreNames.length === 0) {
    db.createObjectStore("BudgetStore", { autoIncrement: true });
  }
};

request.onsuccess = function (e) {
  console.log("success");
  db = e.target.result;

  // Check if app is online before reading from db
  if (navigator.onLine) {
    console.log("Backend online! 🗄️");
    checkDatabase();
  }
};

function saveRecord(record) {
  // TODO: this function should save a transaction object to indexedDB so that
  // it can be synced with the database when the user goes back online.
  console.log("Save record invoked");
  // Create a transaction on the BudgetStore db with readwrite access
  const transaction = db.transaction(["BudgetStore"], "readwrite");

  // Access your BudgetStore object store
  const store = transaction.objectStore("BudgetStore");

  // Add record to your store with add method.
  store.add(record);
}

function checkDatabase() {
  // TODO: this function should check for any saved transactions and post them
  // all to the database. Delete the transactions from IndexedDB if the post
  // request is successful.
  console.log("check db invoked");

  // Open a transaction on your BudgetStore db
  const transaction = db.transaction(["BudgetStore"], "readonly");

  // access your BudgetStore object
  const store = transaction.objectStore("BudgetStore");

  // Get all records from store and set to a variable
  const getAll = store.getAll();

  // If the request was successful
  getAll.onsuccess = async function () {
    if (getAll.result.length === 0) {
      // no items to post to backend
      return;
    }
    // If there are items in the store, we need to bulk add them when we are back online
    const response = await fetch("/api/transaction/bulk", {
      method: "POST",
      body: JSON.stringify(getAll.result),
      headers: {
        Accept: "application/json, text/plain, */*",
        "Content-Type": "application/json",
      },
    });
    const dbTransactions = await response.json();
    // If our returned response is not empty
    if (dbTransactions.length > 0) {
      // Open another transaction to BudgetStore with the ability to read and write
      const delTxn = db.transaction(["BudgetStore"], "readwrite");

      // Assign the current store to a variable
      const currentStore = delTxn.objectStore("BudgetStore");

      // Clear existing entries because our bulk add was successful
      currentStore.clear();
      console.log("Clearing store 🧹");
    }
  };
}

// listen for app coming back online
window.addEventListener("online", checkDatabase);
