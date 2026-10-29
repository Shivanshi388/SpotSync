import { useEffect, useState } from 'react'
import { Car, Plus, RefreshCw, ArrowLeft } from 'lucide-react'
import { listVehicles, createVehicle } from '../services/vehicleService'
import '../styles/mybookings-purple.css'

function go(path) {
  window.history.pushState({}, '', path)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

export default function VehicleManagement() {
  const [vehicles, setVehicles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ registration_number: '', vehicle_type: 'car', make: '', model: '' })

  async function refresh() {
    setLoading(true)
    setError('')
    try {
      setVehicles(await listVehicles())
    } catch (e) {
      setError(e.response?.data?.detail || e.message || 'Could not load vehicles.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { refresh() }, [])

  async function submit(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await createVehicle(Object.fromEntries(Object.entries(form).filter(([, v]) => v.trim())))
      setForm({ registration_number: '', vehicle_type: 'car', make: '', model: '' })
      await refresh()
    } catch (e) {
      setError(e.response?.data?.detail || 'Could not add vehicle. Check the required fields.')
    } finally {
      setSaving(false)
    }
  }

  return <div className="mb-wrap">
    <aside className="mb-side">
      <div className="mb-user"><span className="mb-avatar">S</span><strong>SpotSync</strong></div>
      <nav>
        <button onClick={() => go('/home')}>Dashboard</button>
        <button onClick={() => go('/bookings')}>My Bookings</button>
        <button className="active">My Vehicles</button>
        <button onClick={() => go('/profile')}>Profile</button>
        <button onClick={() => go('/settings')}>Settings</button>
      </nav>
    </aside>
    <section className="mb-main"><div className="mb-card">
      <button type="button" onClick={() => go('/bookings')}><ArrowLeft size={16} /> Back to bookings</button>
      <h1>My Vehicles</h1>
      <form onSubmit={submit} style={{display:'grid',gap:12,maxWidth:520,margin:'20px 0'}}>
        <label>Registration number *
          <input required value={form.registration_number} onChange={e=>setForm({...form,registration_number:e.target.value})} />
        </label>
        <label>Vehicle type
          <select value={form.vehicle_type} onChange={e=>setForm({...form,vehicle_type:e.target.value})}>
            <option value="car">Car</option><option value="bike">Bike</option><option value="scooter">Scooter</option><option value="ev">Electric vehicle</option>
          </select>
        </label>
        <label>Make
          <input value={form.make} onChange={e=>setForm({...form,make:e.target.value})} />
        </label>
        <label>Model
          <input value={form.model} onChange={e=>setForm({...form,model:e.target.value})} />
        </label>
        <button className="mb-primary" disabled={saving} type="submit"><Plus size={16}/> {saving?'Adding…':'Add vehicle'}</button>
      </form>
      {error && <p role="alert">{error}</p>}
      <button type="button" onClick={refresh}><RefreshCw size={15}/> Refresh</button>
      {loading ? <p>Loading vehicles…</p> : vehicles.length === 0 ? <p>No vehicles found. Add a vehicle above.</p> :
        <div className="mb-list">{vehicles.map((v,i)=><article className="mb-row" key={v.id ?? v.registration_number ?? i}>
          <Car size={24}/><div className="mb-info"><strong>{v.registration_number || v.license_plate || v.vehicle_number || 'Vehicle'}</strong><span>{[v.make,v.model,v.vehicle_type].filter(Boolean).join(' · ')}</span></div>
        </article>)}</div>}
    </div></section>
  </div>
}
