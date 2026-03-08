import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
    try {
        const { refresh_token } = await request.json()

        if (!refresh_token) {
            return NextResponse.json(
                { error: 'refresh_token is required' },
                { status: 400 }
            )
        }

        const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
        const clientSecret = process.env.GOOGLE_CLIENT_SECRET || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_SECRET

        if (!clientId || !clientSecret) {
            return NextResponse.json(
                { error: 'OAuth not configured' },
                { status: 500 }
            )
        }

        const response = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                client_id: clientId,
                client_secret: clientSecret,
                refresh_token,
                grant_type: 'refresh_token'
            })
        })

        if (!response.ok) {
            const errorData = await response.json()
            console.error('Google token refresh error:', errorData)
            return NextResponse.json(
                { error: errorData.error_description || 'Failed to refresh token' },
                { status: response.status }
            )
        }

        const tokens = await response.json()

        return NextResponse.json({
            access_token: tokens.access_token,
            expires_at: Date.now() + (tokens.expires_in * 1000)
        })

    } catch (error) {
        console.error('Google refresh error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
