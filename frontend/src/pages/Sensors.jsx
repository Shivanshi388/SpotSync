import React from 'react'
import { useSpotSync } from '../context/SpotSyncContext'

const BAY_ORDER = ['B1-A1','B1-A2','B1-A3','B2-A1','B2-A2','B2-A3','B2-A4']

const color = status => ({
  AVAILABLE: ['#e8f7ef','#137547'],
  OCCUPIED: ['#fff0ee','#b42318'],
  RESERVED: ['#fff6df','#875400'],
  FAULT: ['#f3edff','#6941a5'],
  UNKNOWN: ['#f0f2f5','#5b6472'],
  OUT_OF_SERVICE: ['#f3edff','#6941a5'],
}[status] || ['#f0f2f5','#5b6472'])

const dateText = value =>
  value && !Number.isNaN(new Date(value).getTime())
    ? new Date(value).toLocaleString()
    : 'No valid reading'

export default function Sensors() {
  const { sensors, lastSync, liveError } = useSpotSync()

  const entranceSensor = sensors.find(
    sensor => sensor.sensor_id === 'SENSOR_008'
  )

  const parkingSensors = sensors.filter(
    sensor => sensor.sensor_id !== 'SENSOR_008'
  )

  const ordered = [...parkingSensors].sort(
    (a, b) => BAY_ORDER.indexOf(a.space) - BAY_ORDER.indexOf(b.space)
  )

  const online = ordered.filter(sensor => sensor.is_online === true).length

  const faults = ordered.filter(sensor =>
    !sensor.is_online ||
    ['FAULT', 'UNKNOWN', 'OUT_OF_SERVICE'].includes(
      String(sensor.occupancy || 'UNKNOWN').toUpperCase()
    )
  ).length

  return (
    <main style={{padding:24,maxWidth:1200,margin:'0 auto',color:'#25163d'}}>
      <header style={{display:'flex',justifyContent:'space-between',gap:16,flexWrap:'wrap',marginBottom:22}}>
        <div>
          <div style={{color:'#7042ad',fontSize:11,fontWeight:800,letterSpacing:1.2}}>
            SPOTSYNC · LIVE IOT MONITOR
          </div>
          <h1 style={{margin:'7px 0'}}>Sensor Monitoring</h1>
          <p style={{margin:0,color:'#746b80'}}>
            Actual readings from the authenticated sensor API. Auto-refreshes every 5 seconds.
          </p>
        </div>
        <div style={{fontSize:12,color:liveError?'#b42318':'#16804e'}}>
          {liveError || `Last sync: ${lastSync ? lastSync.toLocaleTimeString() : 'Waiting...'}`}
        </div>
      </header>

      <section style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:12,marginBottom:20}}>
        {[
          ['Parking sensors', ordered.length],
          ['Sensors with recorded readings', ordered.filter(sensor => sensor.timestamp).length],
          ['Online', online],
          ['Fault / unknown / offline', faults],
          ['Last sync', lastSync ? lastSync.toLocaleTimeString() : 'Waiting']
        ].map(([label,value]) => (
          <div key={label} style={{background:'#fff',border:'1px solid #e9e2f0',borderRadius:12,padding:16}}>
            <div style={{fontSize:12,color:'#776d83'}}>{label}</div>
            <strong style={{display:'block',fontSize:23,marginTop:7}}>{value}</strong>
          </div>
        ))}
      </section>

      <section style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(230px,1fr))',gap:14}}>
        {ordered.map(sensor => {
          const status = String(sensor.occupancy || 'UNKNOWN').toUpperCase()
          const [bg,fg] = color(status)

          return (
            <article key={sensor.sensor_id} style={{background:'#fff',border:'1px solid #e9e2f0',borderRadius:14,padding:17}}>
              <div style={{display:'flex',justifyContent:'space-between',gap:8}}>
                <strong>{sensor.sensor_id}</strong>
                <span style={{background:bg,color:fg,padding:'5px 9px',borderRadius:20,fontSize:11,fontWeight:800}}>
                  {status}
                </span>
              </div>

              <h2 style={{fontSize:24,margin:'16px 0 4px'}}>{sensor.space}</h2>

              <div style={{fontSize:12,color:'#746b80'}}>
                {sensor.location} · {sensor.is_online === true ? 'Online' : 'Offline / stale'}
              </div>

              <div style={{marginTop:14,borderTop:'1px solid #f0ebf4',paddingTop:12,lineHeight:1.8,fontSize:13}}>
                <div>Latest event: <strong>{sensor.readingStatus || 'UNKNOWN'}</strong></div>
                <div>Distance: <strong>{sensor.distance_cm == null ? '—' : `${sensor.distance_cm} cm`}</strong></div>
                <div>Last reading: <strong>{dateText(sensor.timestamp)}</strong></div>
                <div>Database slot ID: <strong>{sensor.slotId ?? '—'}</strong></div>
              </div>
            </article>
          )
        })}
      </section>

      {entranceSensor && (
        <section style={{marginTop:16,background:'#fff',border:'1px solid #e9e2f0',borderRadius:14,padding:17}}>
          <div style={{display:'flex',justifyContent:'space-between',gap:8,flexWrap:'wrap'}}>
            <div>
              <div style={{fontSize:11,color:'#7042ad',fontWeight:800}}>ENTRANCE / RAMP SENSOR</div>
              <h2 style={{fontSize:20,margin:'6px 0'}}>{entranceSensor.sensor_id}</h2>
              <div style={{fontSize:12,color:'#746b80'}}>
                Entrance / Exit · {entranceSensor.status}
              </div>
            </div>
            <strong>{entranceSensor.is_online ? 'Online' : 'Offline / stale'}</strong>
          </div>
          <div style={{fontSize:13,marginTop:10}}>
            Latest event: <strong>{entranceSensor.readingStatus || 'UNKNOWN'}</strong>
          </div>
          <div style={{fontSize:13,marginTop:6}}>
            Distance: <strong>{entranceSensor.distance_cm == null ? '—' : `${entranceSensor.distance_cm} cm`}</strong>
          </div>
          <div style={{fontSize:13,marginTop:6}}>
            Last event: <strong>{dateText(entranceSensor.timestamp)}</strong>
          </div>
        </section>
      )}

      <p style={{fontSize:11,color:'#82788e',marginTop:18}}>
        SENSOR_008 is monitored separately and never changes parking-space occupancy.
        Missing sensor readings remain visible as UNKNOWN.
      </p>
    </main>
  )
}
