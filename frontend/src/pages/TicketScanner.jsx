import React, { useEffect, useRef, useState } from 'react'
import { Html5QrcodeScanner } from 'html5-qrcode'
import { PageTitle, Card, Button } from '../components/Shared'
import { api } from '../services/api'

function extractTicketToken(decodedText) {
  const value = String(decodedText || '').trim()

  try {
    const url = new URL(value, window.location.origin)
    const segments = url.pathname.split('/').filter(Boolean)

    const routeIndex = segments.findIndex(segment =>
      ['driver', 'navigate'].includes(segment.toLowerCase())
    )

    if (routeIndex !== -1 && segments[routeIndex + 1]) {
      return decodeURIComponent(segments[routeIndex + 1])
    }
  } catch {
    // QR may contain a raw token.
  }

  return value
}
export default function TicketScanner() {
  const scannerRef = useRef(null)
  const processingRef = useRef(false)
  const [message, setMessage] = useState(
    'Start the camera or select an image containing a SpotSync ticket QR.'
  )
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const scanner = new Html5QrcodeScanner(
      'spotsync-qr-reader',
      {
        fps: 10,
        qrbox: { width: 240, height: 240 },
        rememberLastUsedCamera: true,
        showTorchButtonIfSupported: true
      },
      false
    )

    scannerRef.current = scanner

    scanner.render(
      async (decodedText) => {
        if (processingRef.current) return

        processingRef.current = true
        setBusy(true)
        setError('')
        setResult(null)
        setMessage('QR detected. Validating ticket and completing exit...')

        try {
          const ticketToken = extractTicketToken(decodedText)

          if (!ticketToken) {
            throw new Error('QR code does not contain a valid parking ticket token.')
          }

          const response = await api.tickets.exitWithTicket(ticketToken)
          setResult(response)
          setMessage(response.message || 'Vehicle exit completed successfully.')

          await scanner.clear()
          scannerRef.current = null
        } catch (err) {
          setError(err.message || 'Ticket validation or exit failed.')
          setMessage('This QR could not complete the exit. You can try again.')
          processingRef.current = false
          setBusy(false)
        }
      },
      () => {
        // Ignore camera frames without a QR code.
      }
    )

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(() => {})
        scannerRef.current = null
      }
    }
  }, [])

  function scanAgain() {
    window.location.reload()
  }

  return (
    <>
      <PageTitle
        title="Scan parking exit QR"
        subtitle="Scan the driver's digital ticket to validate it and complete the active parking session."
      />

      <Card
        title="Ticket scanner"
        subtitle="Use the camera or choose a QR image from your device."
      >
        <div id="spotsync-qr-reader" />

        {busy && <p className="muted">{message}</p>}
        {error && <p className="form-error">{error}</p>}
        {!error && !result && <p className="muted">{message}</p>}

        {result && (
          <div className="ticket-preview">
            <div className="ticket-top">
              <b>EXIT COMPLETED</b>
              <span>{result.status || 'COMPLETED'}</span>
            </div>
            <p><b>Vehicle:</b> {result.vehicle_id || '?'}</p>
            <p><b>Parking slot:</b> {result.parking_slot_id || '?'}</p>
            <p><b>Session:</b> {result.session_id || '?'}</p>
            <p>
              <b>Ended at:</b>{' '}
              {result.ended_at
                ? new Date(result.ended_at).toLocaleString('en-IN')
                : '?'}
            </p>
            <p>{result.message || 'Parking session completed.'}</p>
            <Button type="button" onClick={scanAgain}>
              Scan next vehicle
            </Button>
          </div>
        )}
      </Card>
    </>
  )
}
