import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const addExpenseTool = new DynamicStructuredTool({
    name: "add_expense",
    description: "Add one or more expenses to the database. Use this when the user mentions spending money or buying something.",
    schema: z.object({
        expenses: z.array(z.object({
            amount: z.number().describe("The amount of the expense."),
            category: z.string().describe("The category of the expense (e.g., Food, Transport, Shopping)."),
            description: z.string().optional().describe("A brief description of the expense."),
            date: z.string().optional().describe("The date of the expense in ISO format (YYYY-MM-DD). Defaults to today."),
        })).describe("List of expenses to add."),
        sessionId: z.string().describe("The session ID of the user."),
    }),
    func: async ({ expenses, sessionId }) => {
        try {
            const expensesData = expenses.map(e => ({
                amount: e.amount,
                category: e.category,
                description: e.description,
                date: e.date ? new Date(e.date) : new Date(),
                userId: sessionId,
            }));

            const result = await prisma.expense.createMany({
                data: expensesData,
            });

            return `Successfully added ${result.count} expenses.`;
        } catch (error) {
            console.error("Error adding expenses:", error);
            return "Failed to add expenses. Please try again.";
        }
    },
});

export const getExpensesTool = new DynamicStructuredTool({
    name: "get_expenses",
    description: "Retrieve expenses from the database. Use this when the user asks to see their expenses or for a summary.",
    schema: z.object({
        sessionId: z.string().describe("The session ID of the user."),
        startDate: z.string().nullable().optional().describe("Filter expenses after this date (ISO format)."),
        endDate: z.string().nullable().optional().describe("Filter expenses before this date (ISO format)."),
        category: z.string().nullable().optional().describe("Filter by category."),
    }),
    func: async ({ sessionId, startDate, endDate, category }) => {
        try {
            const whereClause: any = { userId: sessionId };

            if (startDate || endDate) {
                whereClause.date = {};
                if (startDate) whereClause.date.gte = new Date(startDate);
                if (endDate) whereClause.date.lte = new Date(endDate);
            }

            if (category) {
                whereClause.category = { contains: category, mode: 'insensitive' };
            }

            const limit = 50;
            const [expenses, totalCount] = await Promise.all([
                prisma.expense.findMany({
                    where: whereClause,
                    orderBy: { date: 'desc' },
                    take: limit,
                    select: {
                        date: true,
                        category: true,
                        amount: true,
                        description: true,
                    },
                }),
                prisma.expense.count({ where: whereClause }),
            ]);

            if (expenses.length === 0) {
                return "No expenses found for the given criteria.";
            }

            const result = {
                expenses,
                totalFound: totalCount,
                limit,
                note: totalCount > limit ? `Showing top ${limit} most recent expenses out of ${totalCount}.` : undefined,
            };

            return JSON.stringify(result);
        } catch (error) {
            console.error("Error retrieving expenses:", error);
            return "Failed to retrieve expenses.";
        }
    },
});

export const deleteExpenseTool = new DynamicStructuredTool({
    name: "delete_expense",
    description: "Delete an expense by ID.",
    schema: z.object({
        expenseId: z.string().describe("The ID of the expense to delete."),
    }),
    func: async ({ expenseId }) => {
        try {
            await prisma.expense.delete({
                where: { id: expenseId },
            });
            return "Expense deleted successfully.";
        } catch (error) {
            console.error("Error deleting expense:", error);
            return "Failed to delete expense. It might not exist.";
        }
    },
});
