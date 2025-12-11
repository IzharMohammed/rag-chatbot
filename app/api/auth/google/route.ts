import { google } from 'googleapis';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId');

    const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URL
    );

    const scopes = [
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/calendar.events',
    ];

    const url = oauth2Client.generateAuthUrl({
        access_type: 'offline', // CRITICAL: requests a refresh token
        scope: scopes,
        prompt: 'consent', // Forces consent screen to ensure we get a refresh token
        include_granted_scopes: true,
        state: sessionId || undefined, // Pass sessionId as state
    });

    return NextResponse.redirect(url);
}
