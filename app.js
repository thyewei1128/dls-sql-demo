// app.js — STATIC demo. The conversation assistant runs 100% in the browser.
// Mirrors the Python backend's logic so the experience matches the real app.

const $ = (id) => document.getElementById(id);

// ---- demo data ----
const STOCK = {
  "ANT":      { code: "ANT",      description: "Antenna Unit 5G",     qtyBalance: 128, uom: "UNIT", unitPrice: 250.00 },
  "CABLE-01": { code: "CABLE-01", description: "Fiber Cable 10m",     qtyBalance: 540, uom: "ROLL", unitPrice: 35.50 },
  "ROUTER-X": { code: "ROUTER-X", description: "Enterprise Router X", qtyBalance: 7,   uom: "UNIT", unitPrice: 1200.00 },
};
const CUSTOMERS = {
  "300-C0001": { code: "300-C0001", companyName: "Sunrise Trading Sdn Bhd", phone: "+60123456789", email: "ar@sunrise.my",         balance: 4520.00, creditTerm: "30 Days" },
  "300-G0002": { code: "300-G0002", companyName: "Green Valley Enterprise", phone: "+60198887777", email: "accounts@greenvalley.my", balance: 0.00,    creditTerm: "C.O.D" },
};

const RM = (n) => "RM" + Number(n).toFixed(2);
const findStock = (c) => STOCK[(c || "").toUpperCase()] || null;
const findCustomer = (c) => CUSTOMERS[(c || "").toUpperCase()] || null;

// pull the first token that looks like a stock code (skip keywords)
const STOP = new Set(["STOCK","QTY","QUANTITY","HOW","MANY","LEFT","OF","FOR","THE","IS","CHECK",
  "CUSTOMER","WHO","INVOICE","DO","DELIVERY","ORDER","CREATE","MAKE","NEW","LIST","ITEMS","ITEM"]);
function stockCodeIn(text) {
  for (const t of text.toUpperCase().split(/\s+/)) {
    if (!STOP.has(t) && /^[A-Z0-9][A-Z0-9-]*$/.test(t) && /[A-Z]/.test(t) && STOCK[t]) return t;
  }
  // fall back: any code-like token
  for (const t of text.toUpperCase().split(/\s+/)) {
    if (!STOP.has(t) && /^[A-Z0-9][A-Z0-9-]*$/.test(t) && /[A-Z]/.test(t) && !/^\d{3}-/.test(t)) return t;
  }
  return "";
}
const custCodeIn = (text) => (text.toUpperCase().match(/\b\d{3}-[A-Z0-9]+\b/) || [""])[0];
const numberIn = (text) => {
  // ignore customer/item codes; only a token that is entirely digits is a qty
  const nums = text.replace(/\d{3}-[A-Z0-9]+/i, "").split(/\s+/).filter((t) => /^\d+$/.test(t));
  return nums.length ? parseInt(nums[nums.length - 1], 10) : null;
};

// ---- the assistant brain ----
function reply(text) {
  const t = text.trim();
  const low = t.toLowerCase();
  if (!t) return null;

  if (/^(hi|hello|hey|menu|start)\b/.test(low))
    return "Hi! I can help with:\n• <b>stock ANT</b> — check quantity\n• <b>customer 300-C0001</b> — view a customer\n• <b>invoice 300-C0001 ANT 5</b> — create an invoice\n• <b>do 300-C0001 ANT 5</b> — create a delivery order\n\nType <b>help</b> anytime.";

  if (low.startsWith("help"))
    return "Commands:\n• <b>stock &lt;code&gt;</b> — e.g. stock ANT (try ANT, CABLE-01, ROUTER-X)\n• <b>customer &lt;code&gt;</b> — e.g. customer 300-C0001\n• <b>invoice &lt;cust&gt; &lt;item&gt; &lt;qty&gt;</b>\n• <b>do &lt;cust&gt; &lt;item&gt; &lt;qty&gt;</b> — delivery order\n• <b>list stock</b> / <b>list customers</b>";

  if (/\blist\b.*\b(stock|item)/.test(low))
    return "Stock items:\n" + Object.values(STOCK)
      .map(s => `• <b>${s.code}</b> — ${s.description} (${s.qtyBalance} ${s.uom})`).join("\n");
  if (/\blist\b.*customer/.test(low))
    return "Customers:\n" + Object.values(CUSTOMERS)
      .map(c => `• <b>${c.code}</b> — ${c.companyName}`).join("\n");

  // invoice / delivery order
  if (low.includes("invoice") || /\bdo\b/.test(low) || low.includes("delivery")) {
    const isDO = !low.includes("invoice");
    const kind = isDO ? "Delivery Order" : "Invoice";
    const cust = findCustomer(custCodeIn(t));
    const item = findStock(stockCodeIn(t));
    const qty = numberIn(t.replace(/\d{3}-[A-Z0-9]+/i, "")); // ignore the customer code's digits
    if (!cust) return `Which customer? e.g. <b>${isDO ? "do" : "invoice"} 300-C0001 ANT 5</b>`;
    if (!item) return `Which item? e.g. <b>${isDO ? "do" : "invoice"} ${cust.code} ANT 5</b>`;
    if (!qty)  return `How many ${item.code}? e.g. <b>${isDO ? "do" : "invoice"} ${cust.code} ${item.code} 5</b>`;
    const total = qty * item.unitPrice;
    const docno = (isDO ? "DO-" : "IV-") + "0001";
    return `✅ <b>${kind} ${docno}</b> created <i>(demo)</i>\n` +
           `Customer: ${cust.companyName} (${cust.code})\n` +
           `Item: ${item.code} — ${item.description}\n` +
           `Qty: ${qty} ${item.uom} × ${RM(item.unitPrice)}\n` +
           `Total: <b>${RM(total)}</b>`;
  }

  // customer
  if (low.includes("customer") || low.includes("who is") || (custCodeIn(t) && !low.includes("stock"))) {
    const c = findCustomer(custCodeIn(t));
    if (!c) return "No such customer. Try <b>300-C0001</b> or <b>300-G0002</b>.";
    return `<b>${c.companyName}</b> (${c.code})\n` +
           `Outstanding: <b>${RM(c.balance)}</b>\nTerms: ${c.creditTerm}\n` +
           `Phone: ${c.phone}\nEmail: ${c.email}`;
  }

  // stock (default for code-like / quantity questions)
  if (low.includes("stock") || low.includes("how many") || low.includes("qty") ||
      low.includes("quantity") || stockCodeIn(t)) {
    const code = stockCodeIn(t);
    const s = findStock(code);
    if (!s) return `No item${code ? " '" + code + "'" : ""}. Try <b>ANT</b>, <b>CABLE-01</b> or <b>ROUTER-X</b>.`;
    return `<b>${s.description}</b> (${s.code})\n` +
           `On hand: <b>${s.qtyBalance} ${s.uom}</b>\nUnit price: ${RM(s.unitPrice)}`;
  }

  return "Sorry, I didn't get that. Type <b>help</b> to see what I can do.";
}

// ---- chat UI ----
function addBubble(html, who) {
  const div = document.createElement("div");
  div.className = "bubble " + who;
  div.innerHTML = html;
  $("chat").appendChild(div);
  $("chat").scrollTop = $("chat").scrollHeight;
  return div;
}
function showTyping() {
  const d = addBubble('<span class="dot"></span><span class="dot"></span><span class="dot"></span>', "bot typing");
  return d;
}
function send(textFromChip) {
  const text = (textFromChip ?? $("msgInput").value).trim();
  if (!text) return;
  addBubble(escapeHtml(text), "user");
  $("msgInput").value = "";
  const typing = showTyping();
  setTimeout(() => { typing.remove(); addBubble(reply(text), "bot"); }, 420);
}
const escapeHtml = (s) => s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));

// ---- connection (PREVIEW only on this public page) ----
function readConn() {
  return {
    dcfPath: $("dcfPath").value.trim(),
    dbName: $("dbName").value.trim(),
    user: $("user").value.trim() || "ADMIN",
    passwordSet: !!$("password").value,
  };
}
function loadConn() {
  let c = {};
  try { c = JSON.parse(localStorage.getItem("dls_conn") || "{}"); } catch {}
  if (c.dcfPath) $("dcfPath").value = c.dcfPath;
  if (c.dbName) $("dbName").value = c.dbName;
  if (c.user) $("user").value = c.user;
  if (c.passwordSet) $("password").placeholder = "•••••• (saved)";
}
function testConn() {
  const c = readConn();
  const m = $("connMsg");
  if (!c.dcfPath || !c.dbName) {
    m.textContent = "Enter your DCF path and database name first.";
    m.className = "conn-msg err";
    return;
  }
  m.textContent = "✓ On your office PC, the app would log in to " + c.dbName + " now.";
  m.className = "conn-msg ok";
}
function saveConn() {
  const c = readConn();
  localStorage.setItem("dls_conn", JSON.stringify(c));
  $("password").value = "";
  if (c.passwordSet) $("password").placeholder = "•••••• (saved)";
  const m = $("connMsg");
  m.textContent = "Saved ✓ (preview — real linking happens in the app on your SQL PC)";
  m.className = "conn-msg ok";
}

// ---- wire up ----
$("sendBtn").addEventListener("click", () => send());
$("msgInput").addEventListener("keydown", (e) => e.key === "Enter" && send());
$("chips").addEventListener("click", (e) => {
  if (e.target.classList.contains("chip")) send(e.target.dataset.msg);
});
$("testBtn").addEventListener("click", testConn);
$("saveBtn").addEventListener("click", saveConn);
loadConn();
