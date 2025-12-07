import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { google } from 'googleapis';

const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URL
);

oauth2Client.setCredentials({
    access_token: process.env.GOOGLE_ACCESS_TOKEN,
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
});

const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

// Mock Database
interface CalendarEvent {
    id: string;
    title: string;
    startTime: string;
    endTime: string;
    description?: string;
}

let events: CalendarEvent[] = [];

type attendee = {
    email: string;
    displayName: string;
};

const createEventSchema = z.object({
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
    ),
});

type EventData = z.infer<typeof createEventSchema>;

export const createEventTool = tool(
    async (eventData: EventData) => {
        const { summary, start, end, attendees } = eventData;

        const response = await calendar.events.insert({
            calendarId: 'team.codersgyan@gmail.com',
            sendUpdates: 'all',
            conferenceDataVersion: 1,
            requestBody: {
                summary,
                start,
                end,
                attendees,
                conferenceData: {
                    createRequest: {
                        requestId: crypto.randomUUID(),
                        conferenceSolutionKey: {
                            type: 'hangoutsMeet',
                        },
                    },
                },
            },
        });

        if (response.statusText === 'OK') {
            return 'The meeting has been created.';
        }

        return "Couldn't create a meeting.";
    },
    {
        name: "create_calendar_event",
        description: 'Call to create the calendar events.',
        schema: createEventSchema,
    }
);

type Params = {
    q: string;
    timeMin: string;
    timeMax: string;
};

export const listEventsTool = tool(
    async (params: Params) => {
        const { q, timeMin, timeMax } = params;

        try {
            const response = await calendar.events.list({
                calendarId: 'primary',
                q: q,
                timeMin,
                timeMax,
            });

            const result = response.data.items?.map((event) => {
                return {
                    id: event.id,
                    summary: event.summary,
                    status: event.status,
                    organiser: event.organizer,
                    start: event.start,
                    end: event.end,
                    attendees: event.attendees,
                    meetingLink: event.hangoutLink,
                    eventType: event.eventType,
                };
            });

            return JSON.stringify(result);
        } catch (err) {
            console.log('EERRRR', err);
        }
    },
    {
        name: 'get-events',
        description: 'Call to get the calendar events.',
        schema: z.object({
            q: z
                .string()
                .describe(
                    "The query to be used to get events from google calendar. It can be one of these values: summary, description, location, attendees display name, attendees email, organiser's name, organiser's email"
                ),
            timeMin: z.string().describe('The from datetime to get events.'),
            timeMax: z.string().describe('The to datetime to get events.'),
        }),
    }
);

export const deleteEventTool = tool(
    async ({ id }) => {
        const initialLength = events.length;
        events = events.filter((e) => e.id !== id);

        if (events.length === initialLength) {
            return JSON.stringify({
                success: false,
                message: `Event with ID ${id} not found`,
            });
        }

        return JSON.stringify({
            success: true,
            message: `Event with ID ${id} deleted successfully`,
        });
    },
    {
        name: "delete_calendar_event",
        description: "Delete a calendar event by ID",
        schema: z.object({
            id: z.string().describe("The ID of the event to delete"),
        }),
    }
);
