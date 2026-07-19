import assert from "node:assert";
import { extractLoadGuardEmail, slugifyCompany } from "../app/api/scrape/helpers.js";

const emailHtml = `
  <div>
    <strong>Email Address:</strong>
    <span>contact@heritagehauling.com</span>
  </div>
`;
const mailtoHtml = `<a href="mailto:info@heritagehaul.com">Email Us</a>`;
const anyEmailHtml = `Reach us at support@heritagehauling.com for more details.`;

assert.strictEqual(extractLoadGuardEmail(emailHtml), "contact@heritagehauling.com");
assert.strictEqual(extractLoadGuardEmail(mailtoHtml), "info@heritagehaul.com");
assert.strictEqual(extractLoadGuardEmail(anyEmailHtml), "support@heritagehauling.com");
assert.strictEqual(slugifyCompany("Heritage Hauling Corporation"), "heritage-hauling-corporation");
console.log("All scrape helper tests passed.");
