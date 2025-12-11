import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { google } from 'googleapis';
import { prisma } from '@/lib/prisma';

// Helper to get authenticated client for a session
async function getAuthClient(sessionId: string) {
    const userToken = await prisma.userToken.findUnique({
        where: { sessionId },
    });

    if (!userToken) {
        throw new Error("User not authenticated. Please connect your Google Calendar first.");
    }

    const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URL
    );

    oauth2Client.setCredentials({
        access_token: userToken.accessToken,
        refresh_token: userToken.refreshToken,
        expiry_date: Number(userToken.expiryDate),
    });

    // Automatically refresh token if needed
    // The googleapis library handles this if refresh_token is present
    // But we might want to listen to the 'tokens' event to save new tokens
    oauth2Client.on('tokens', async (tokens) => {
        if (tokens.access_token) {
            await prisma.userToken.update({
                where: { sessionId },
                data: {
                    accessToken: tokens.access_token,
                    expiryDate: tokens.expiry_date ? BigInt(tokens.expiry_date) : undefined,
                    refreshToken: tokens.refresh_token || undefined, // Only update if new one provided
                },
            });
        }
    });

    return oauth2Client;
}

const createEventSchema = z.object({
    sessionId: z.string().describe("The session ID of the user"),
    summary: z.string().describe('The title of the event'),
    start: z.object({
        dateTime: z.string().describe('The date time of start of the event.'),
        timeZone: z.string().describe('Current IANA timezone string.'),
    }),
    end: z.object({
        dateTime: z.string().describe('The date time of end of the event.'),
        timeZone: z.string().describe('Current IANA timezone string.'),
    }),
    attendees: z.array(
        z.object({
            email: z.string().describe('The email of the attendee'),
            displayName: z.string().describe('Then name of the attendee.'),
        })
    ).optional(),
});

type EventData = z.infer<typeof createEventSchema>;

export const createEventTool = tool(
    async (eventData: EventData) => {
        const { sessionId, summary, start, end, attendees } = eventData;

        try {
            const auth = await getAuthClient(sessionId);
            const calendar = google.calendar({ version: 'v3', auth });

            const response = await calendar.events.insert({
                calendarId: 'primary',
                sendUpdates: 'all',
                conferenceDataVersion: 1,
                requestBody: {
                    summary,
                    start,
                    end,
                    attendees,
                    conferenceData: {
                        createRequest: {
                            requestId: Math.random().toString(36).substring(7),
                            conferenceSolutionKey: {
                                type: 'hangoutsMeet',
                            },
                        },
                    },
                },
            });

            if (response.status === 200) {
                return `The meeting has been created. Link: ${response.data.htmlLink}`;
            }

            return "Couldn't create a meeting.";
        } catch (error) {
            return `Error creating event: ${error instanceof Error ? error.message : "Unknown error"}`;
        }
    },
    {
        name: "create_calendar_event",
        description: 'Call to create the calendar events.',
        schema: createEventSchema,
    }
);

export const listEventsTool = tool(
    async ({ sessionId, q, timeMin, timeMax }: { sessionId: string, q?: string | null, timeMin?: string | null, timeMax?: string | null }) => {
        try {
            const auth = await getAuthClient(sessionId);
            const calendar = google.calendar({ version: 'v3', auth });

            const response = await calendar.events.list({
                calendarId: 'primary',
                q: q || undefined,
                timeMin: timeMin || undefined,
                timeMax: timeMax || undefined,
                maxResults: 10,
                singleEvents: true,
                orderBy: 'startTime',
            });

            const result = response.data.items?.map((event) => ({
                id: event.id,
                summary: event.summary,
                start: event.start,
                end: event.end,
                link: event.htmlLink,
                meetLink: event.hangoutLink
            }));

            if (!result || result.length === 0) {
                return "No events found.";
            }

            return JSON.stringify(result);
        } catch (error) {
            return `Error listing events: ${error instanceof Error ? error.message : "Unknown error"}`;
        }
    },
    {
        name: 'get-events',
        description: 'Call to get the calendar events.',
        schema: z.object({
            sessionId: z.string().describe("The session ID of the user"),
            q: z.string().nullable().optional().describe("Query string to search events"),
            timeMin: z.string().nullable().optional().describe("Start time (ISO string)"),
            timeMax: z.string().nullable().optional().describe("End time (ISO string)"),
        }),
    }
);

export const deleteEventTool = tool(
    async ({ sessionId, id }: { sessionId: string, id: string }) => {
        try {
            const auth = await getAuthClient(sessionId);
            const calendar = google.calendar({ version: 'v3', auth });

            await calendar.events.delete({
                calendarId: 'primary',
                eventId: id,
            });

            return `Event with ID ${id} deleted successfully`;
        } catch (error) {
            return `Error deleting event: ${error instanceof Error ? error.message : "Unknown error"}`;
        }
    },
    {
        name: "delete_calendar_event",
        description: "Delete a calendar event by ID",
        schema: z.object({
            sessionId: z.string().describe("The session ID of the user"),
            id: z.string().describe("The ID of the event to delete"),
        }),
    }
);
