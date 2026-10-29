"use client";

import Link from "next/link";
import { api } from "./api";
import type { ResourceConfig, Row } from "@/components/resource-page";
import { FormatValue } from "@/components/ui";

const toggle = (endpoint: string, method: "POST" | "PATCH" = "POST") => ({
  label: "Toggle",
  run: (row: Row) => api(`${endpoint}/${row.id}/toggle`, { method, body: {} }),
});

const userCell = (row: Row) => {
  // Wallet transactions carry the user under wallet.user.
  const user = (row.user ?? (row.wallet as Row | undefined)?.user) as Row | undefined;
  const id = (user?.id ?? row.userId) as string | undefined;
  const label = (user?.email ?? user?.name ?? row.userEmail ?? id) as string | undefined;
  return id ? <Link className="text-indigo-600 hover:underline" href={`/users/${id}`}>{label}</Link> : <FormatValue value={label} />;
};

/**
 * Every generic `/manage/<slug>` page. Endpoints are paths under /api/v1 and
 * mirror the backend's admin routers (src/routes/admin*.routes.ts).
 */
export const RESOURCES: Record<string, ResourceConfig> = {
  // ─── AI ──────────────────────────────────────────────────────────────────
  "ai-providers": {
    superWrites: true,
    title: "AI providers",
    description: "Upstream providers and their credentials.",
    endpoint: "/ai/ai-providers",
    columns: [{ key: "name" }, { key: "slug" }, { key: "providerType", label: "Type" }, { key: "baseUrl" }, { key: "healthStatus", label: "Health" }, { key: "isActive" }],
    create: { template: { name: "", slug: "", baseUrl: "https://", isActive: true } },
    edit: { omit: ["apiKeyEncrypted", "healthStatus", "lastHealthCheck"] },
    remove: {},
    actions: [{ label: "Test", run: (row) => api(`/ai/ai-providers/${row.id}/test-connection`, { method: "POST", body: {} }) }],
  },
  "ai-models": {
    superWrites: true,
    title: "AI models",
    description: "Every model the platform can run, with credit pricing. Editing requires SUPER_ADMIN.",
    endpoint: "/ai/ai-models",
    filters: [
      { key: "search", label: "Search models", type: "search" },
      { key: "status", label: "Status", type: "select", options: [{ value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }] },
    ],
    columns: [{ key: "name" }, { key: "slug" }, { key: "operationType", label: "Type" }, { key: "creditCost", label: "Credits" }, { key: "isActive" }, { key: "updatedAt" }],
    edit: {},
    remove: {},
    actions: [
      { label: "Disable", show: (r) => r.isActive === true, run: (r) => api(`/ai/ai-models/${r.id}`, { method: "PATCH", body: { isActive: false } }) },
      { label: "Enable", show: (r) => r.isActive !== true, run: (r) => api(`/ai/ai-models/${r.id}`, { method: "PATCH", body: { isActive: true } }) },
    ],
  },
  "ai-endpoints": {
    superWrites: true,
    title: "AI endpoints",
    endpoint: "/ai/ai-endpoints",
    edit: {},
    remove: {},
  },
  "tool-registry": {
    superWrites: true,
    title: "Tool registry",
    description: "Every studio tool and its configuration.",
    endpoint: "/admin/tool-registry",
    pagination: false,
    rowKey: "toolKey",
  },
  "ai-apps": {
    title: "AI apps",
    endpoint: "/admin-panel/ai-apps",
    create: { template: { name: "", slug: "", description: "", isActive: true } },
    edit: {},
    remove: {},
  },
  styles: {
    superWrites: true,
    title: "Image styles",
    endpoint: "/admin-panel/styles",
    create: { template: { name: "", slug: "", category: "", promptSuffix: "", isActive: true } },
    edit: {},
    remove: {},
    actions: [toggle("/admin-panel/styles")],
  },
  voices: {
    title: "Voices",
    endpoint: "/admin-panel/voices",
    edit: {},
    remove: {},
    actions: [toggle("/admin-panel/voices", "PATCH")],
  },

  // ─── Users ───────────────────────────────────────────────────────────────
  "guest-credits": {
    superOnly: true,
    title: "Guest credit accounts",
    description: "Anonymous visitors holding trial credits.",
    endpoint: "/admin-panel/guest-credits/accounts",
  },

  // ─── Billing ─────────────────────────────────────────────────────────────
  subscriptions: {
    superOnly: true,
    title: "Subscriptions",
    endpoint: "/admin-panel/billing/subscriptions",
    columns: [{ key: "user", render: userCell }, { key: "plan" }, { key: "status" }, { key: "billingCycle" }, { key: "currentPeriodEnd", label: "Period end" }, { key: "createdAt" }],
    detailHref: (row) => `/users/${(row.user as Row | undefined)?.id ?? row.userId}`,
  },
  payments: {
    superOnly: true,
    title: "Payments",
    endpoint: "/admin-panel/billing/payments",
    filters: [
      { key: "status", label: "Status", type: "select", options: ["COMPLETED", "PENDING", "FAILED", "REFUNDED"].map((s) => ({ value: s, label: s })) },
    ],
    columns: [{ key: "user", render: userCell }, { key: "amount" }, { key: "currency" }, { key: "status" }, { key: "gateway" }, { key: "createdAt" }],
  },
  plans: {
    superWrites: true,
    title: "Plans",
    description: "Subscription plans offered on the pricing page.",
    endpoint: "/admin-panel/plans",
    columns: [{ key: "name" }, { key: "slug" }, { key: "monthlyPrice" }, { key: "annualPrice" }, { key: "creditAmount", label: "Credits" }, { key: "isActive" }],
    create: {
      template: {
        name: "", slug: "", monthlyPrice: 9.99, annualPrice: 99, currency: "USD", autoCredits: true, billingType: "RECURRING",
        creditsNeverExpire: true, requestsPerMinute: 30, requestsPerDay: 1000, isActive: true,
      },
    },
    edit: {},
    remove: {},
  },
  "topup-packages": {
    superOnly: true,
    title: "Top-up packs",
    endpoint: "/admin-panel/topups/packages",
    edit: { path: (r) => `/admin-panel/topups/packages/${r.id}` },
    create: { template: { name: "", credits: 100, price: 9.99, currency: "USD" } },
    actions: [
      { label: "Activate", show: (r) => r.isActive === false, run: (r) => api(`/admin-panel/topups/packages/${r.id}/activate`, { method: "POST", body: {} }) },
      { label: "Deactivate", show: (r) => r.isActive !== false, run: (r) => api(`/admin-panel/topups/packages/${r.id}/deactivate`, { method: "POST", body: {} }) },
    ],
  },
  "topup-orders": {
    superOnly: true,
    title: "Top-up orders",
    endpoint: "/admin-panel/topups/orders",
  },
  coupons: {
    superWrites: true,
    title: "Coupons",
    endpoint: "/admin-panel/coupons",
    columns: [{ key: "code" }, { key: "credits" }, { key: "maxRedemptions" }, { key: "redemptionCount", label: "Redeemed" }, { key: "expiresAt" }, { key: "isActive" }],
    create: { template: { code: "", credits: 100, maxRedemptions: 1, expiresAt: null, isActive: true } },
    edit: {},
    remove: {},
  },
  "credit-transactions": {
    title: "Credit ledger",
    description: "Every wallet transaction across all users.",
    endpoint: "/admin-panel/credits/transactions",
    filters: [{ key: "search", label: "Search transactions", type: "search" }],
    columns: [{ key: "user", render: userCell }, { key: "type" }, { key: "amount" }, { key: "balanceAfter", label: "Balance after" }, { key: "description" }, { key: "createdAt" }],
  },

  // ─── Content ─────────────────────────────────────────────────────────────
  blogs: {
    title: "Blogs",
    endpoint: "/admin-panel/blogs",
    filters: [{ key: "search", label: "Search posts", type: "search" }],
    columns: [{ key: "title" }, { key: "slug" }, { key: "status" }, { key: "publishedAt" }, { key: "updatedAt" }],
    create: { template: { title: "", slug: "", excerpt: "", content: "", tags: [] } },
    edit: {},
    remove: {},
    actions: [
      { label: "Publish", show: (r) => !r.publishedAt && r.status !== "PUBLISHED", run: (r) => api(`/admin-panel/blogs/${r.id}/publish`, { method: "POST", body: {} }) },
      { label: "Unpublish", show: (r) => !!r.publishedAt || r.status === "PUBLISHED", run: (r) => api(`/admin-panel/blogs/${r.id}/unpublish`, { method: "POST", body: {} }) },
    ],
  },
  announcements: {
    title: "Announcements",
    endpoint: "/admin-panel/announcements",
    create: { template: { title: "", message: "", isActive: true } },
    edit: {},
    remove: {},
  },
  banners: {
    title: "Banners",
    endpoint: "/admin-panel/banners",
    create: { template: { title: "", imageUrl: "", linkUrl: "", isActive: true } },
    edit: {},
    remove: {},
  },
  faqs: {
    title: "FAQs",
    endpoint: "/admin-panel/faqs",
    columns: [{ key: "question" }, { key: "category" }, { key: "order" }, { key: "isPublished" }, { key: "updatedAt" }],
    create: { template: { question: "", answer: "", category: "general", order: 0, isPublished: true } },
    edit: {},
    remove: {},
  },
  "homepage-items": {
    title: "Homepage items",
    endpoint: "/admin-panel/homepage-items",
    create: { template: { title: "", isActive: true } },
    edit: {},
    remove: {},
  },
  showcase: {
    title: "Showcase",
    endpoint: "/admin-panel/showcase",
    create: { template: { title: "", mediaUrl: "", isActive: true } },
    edit: {},
    remove: {},
  },
  navigation: {
    title: "Navigation",
    endpoint: "/admin-panel/navigation",
    create: { template: { label: "", href: "/", isActive: true } },
    edit: {},
    remove: {},
    actions: [toggle("/admin-panel/navigation")],
  },

  // ─── System ──────────────────────────────────────────────────────────────
  "audit-logs": {
    title: "Audit logs",
    description: "Every privileged admin action.",
    endpoint: "/admin-panel/audit-logs",
    pageSize: 50,
    filters: [{ key: "action", label: "Filter by action", type: "search" }],
    columns: [{ key: "createdAt" }, { key: "adminId", label: "Admin" }, { key: "action" }, { key: "entityType", label: "Entity" }, { key: "entityId", label: "Entity ID" }, { key: "ipAddress", label: "IP" }],
  },
};
