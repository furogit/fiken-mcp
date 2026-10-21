import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { get, mutate, cp } from "../client.js";

const R = { annotations: { readOnlyHint: true } } as const;
const W = { annotations: { readOnlyHint: false } } as const;
const D = { annotations: { readOnlyHint: false, destructiveHint: true } } as const;

function ok(data: unknown) {
    return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}
function err(e: unknown) {
    return {
        content: [
            { type: "text" as const, text: `Error: ${e instanceof Error ? e.message : String(e)}` },
        ],
        isError: true as const,
    };
}

const invoiceishDraftLine = z.object({
    invoiceishDraftLineId: z.number().int().optional(),
    net: z.number().int().optional().describe("Net amount in cents"),
    vat: z.number().int().optional().describe("VAT amount in cents"),
    vatType: z
        .string()
        .optional()
        .describe('VAT type, e.g. "HIGH", "NONE", "LOW", "EXEMPT_IMPORT_EXPORT"'),
    gross: z.number().int().optional().describe("Gross amount in cents"),
    vatInPercent: z.number().optional().describe("VAT percentage from 0 to 100"),
    unitPrice: z.number().int().optional().describe("Net price per unit in cents"),
    quantity: z.number().describe("Number of units"),
    discount: z.number().optional().describe("Discount percentage"),
    productName: z.string().optional(),
    productId: z.number().int().optional(),
    description: z.string().optional(),
    comment: z.string().optional(),
    incomeAccount: z.string().optional().describe('Account code, e.g. "3000"'),
});

const roundingType = z
    .enum(["none", "round_half", "round_whole", "round_down_half", "round_down_whole"])
    .optional();

/** Fiken POST/PUT /offers/drafts uses invoiceishDraftRequest. */
export const offerDraftSchema = z.object({
    type: z
        .enum(["invoice", "cash_invoice", "offer", "order_confirmation", "credit_note"])
        .default("offer")
        .describe('Draft type. Offer drafts use "offer"'),
    uuid: z.string().optional(),
    issueDate: z.string().optional().describe("YYYY-MM-DD"),
    daysUntilDueDate: z.number().int().describe("Days until due date"),
    invoiceText: z.string().optional(),
    yourReference: z.string().optional(),
    ourReference: z.string().optional(),
    orderReference: z.string().optional(),
    lines: z.array(invoiceishDraftLine).optional(),
    currency: z.string().optional().describe('ISO 4217, e.g. "NOK"'),
    bankAccountNumber: z.string().optional(),
    iban: z.string().optional(),
    bic: z.string().optional(),
    paymentAccount: z.string().optional().describe("Account code for payment"),
    customerId: z.number().int().describe("Customer contact ID"),
    contactPersonId: z.number().int().optional(),
    projectId: z.number().int().optional(),
    roundingType,
});

export function register(server: McpServer) {
    server.registerTool(
        "fiken_list_offers",
        {
            ...R,
            description: "Returns all offers for the company",
            inputSchema: z.object({
                page: z.number().int().optional(),
                pageSize: z.number().int().optional(),
            }),
        },
        async (p) => {
            try {
                return ok(await get(cp("/offers"), p));
            } catch (e) {
                return err(e);
            }
        },
    );

    server.registerTool(
        "fiken_get_offer",
        {
            ...R,
            description: "Returns a specific offer by ID",
            inputSchema: z.object({ offerId: z.number().int() }),
        },
        async ({ offerId }) => {
            try {
                return ok(await get(cp(`/offers/${offerId}`)));
            } catch (e) {
                return err(e);
            }
        },
    );

    server.registerTool(
        "fiken_get_offer_counter",
        {
            ...R,
            description: "Retrieves the current offer number counter",
            inputSchema: z.object({}),
        },
        async () => {
            try {
                return ok(await get(cp("/offers/counter")));
            } catch (e) {
                return err(e);
            }
        },
    );

    server.registerTool(
        "fiken_create_offer_counter",
        {
            ...W,
            description: "Creates the first offer number counter",
            inputSchema: z.object({ value: z.number().int().optional() }),
        },
        async (body) => {
            try {
                return ok(await mutate("POST", cp("/offers/counter"), body));
            } catch (e) {
                return err(e);
            }
        },
    );

    server.registerTool(
        "fiken_list_offer_drafts",
        {
            ...R,
            description: "Returns all offer drafts for the company",
            inputSchema: z.object({
                page: z.number().int().optional(),
                pageSize: z.number().int().optional(),
            }),
        },
        async (p) => {
            try {
                return ok(await get(cp("/offers/drafts"), p));
            } catch (e) {
                return err(e);
            }
        },
    );

    server.registerTool(
        "fiken_create_offer_draft",
        {
            ...W,
            description: "Creates a new offer draft",
            inputSchema: offerDraftSchema,
        },
        async (body) => {
            try {
                return ok(
                    await mutate("POST", cp("/offers/drafts"), {
                        ...body,
                        type: body.type ?? "offer",
                    }),
                );
            } catch (e) {
                return err(e);
            }
        },
    );

    server.registerTool(
        "fiken_get_offer_draft",
        {
            ...R,
            description: "Returns a specific offer draft",
            inputSchema: z.object({ draftId: z.number().int() }),
        },
        async ({ draftId }) => {
            try {
                return ok(await get(cp(`/offers/drafts/${draftId}`)));
            } catch (e) {
                return err(e);
            }
        },
    );

    server.registerTool(
        "fiken_update_offer_draft",
        {
            ...W,
            description: "Updates an offer draft",
            inputSchema: z.object({ draftId: z.number().int(), ...offerDraftSchema.shape }),
        },
        async ({ draftId, ...body }) => {
            try {
                return ok(
                    await mutate("PUT", cp(`/offers/drafts/${draftId}`), {
                        ...body,
                        type: body.type ?? "offer",
                    }),
                );
            } catch (e) {
                return err(e);
            }
        },
    );

    server.registerTool(
        "fiken_delete_offer_draft",
        {
            ...D,
            description: "Deletes an offer draft",
            inputSchema: z.object({ draftId: z.number().int() }),
        },
        async ({ draftId }) => {
            try {
                return ok(await mutate("DELETE", cp(`/offers/drafts/${draftId}`)));
            } catch (e) {
                return err(e);
            }
        },
    );

    server.registerTool(
        "fiken_get_offer_draft_attachments",
        {
            ...R,
            description: "Returns all attachments for an offer draft",
            inputSchema: z.object({ draftId: z.number().int() }),
        },
        async ({ draftId }) => {
            try {
                return ok(await get(cp(`/offers/drafts/${draftId}/attachments`)));
            } catch (e) {
                return err(e);
            }
        },
    );

    server.registerTool(
        "fiken_create_offer_from_draft",
        {
            ...W,
            description: "Creates a finalized offer from a draft",
            inputSchema: z.object({ draftId: z.number().int() }),
        },
        async ({ draftId }) => {
            try {
                return ok(await mutate("POST", cp(`/offers/drafts/${draftId}/createOffer`)));
            } catch (e) {
                return err(e);
            }
        },
    );

    server.registerTool(
        "fiken_send_offer",
        {
            ...W,
            description: "Sends an offer via email",
            inputSchema: z.object({
                offerId: z.number().int(),
                method: z.array(z.enum(["email", "auto"])),
                recipientName: z.string().optional(),
                recipientEmail: z.string().optional(),
                message: z.string().optional(),
            }),
        },
        async (body) => {
            try {
                return ok(await mutate("POST", cp("/offers/send"), body));
            } catch (e) {
                return err(e);
            }
        },
    );
}
