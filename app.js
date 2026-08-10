/* Urban Curlew — standalone vanilla JS SPA. Browser APIs used: geolocation (Nearby Stations), localStorage (audit persistence only — login is NOT persisted, fresh every launch). */

const FACILITY_DEFS = [
  { key: 'statusConvenienceStore', label: 'Convenience Store', icon: 'convenience' },
  { key: 'statusJetWash', label: 'Jet Wash', icon: 'jetwash' },
  { key: 'statusCarWash', label: 'Car Wash', icon: 'carwash' },
  { key: 'statusAtm', label: 'ATM', icon: 'atm' },
  { key: 'statusToilets', label: 'Toilets', icon: 'toilets' },
  { key: 'statusElectricCharger', label: 'EV Charger', icon: 'ev' },
  { key: 'statusCarWater', label: 'Car Water', icon: 'carwater' },
  { key: 'statusDrinkingWater', label: 'Drinking Water', icon: 'water' },
  { key: 'statusCoffee', label: 'Coffee', icon: 'coffee' },
  { key: 'statusAirMachine', label: 'Air Machine', icon: 'air' },
  { key: 'statusAdBlue', label: 'AdBlue', icon: 'adblue' },
  { key: 'statusCalorGas', label: 'Calor Gas', icon: 'calor' },
  { key: 'statusParking', label: 'Parking', icon: 'parking' },
  { key: 'statusDisabledParking', label: 'Disabled Parking', icon: 'disabledparking' },
  { key: 'statusParcelLocker', label: 'Parcel Locker', icon: 'parcellocker' },
  { key: 'statusWaitingTime', label: 'Waiting Time', icon: 'waitingtime' },
  { key: 'statusPayAtPump', label: 'Pay at Pump', icon: 'payatpump' },
  { key: 'statusFuelCard', label: 'Fuel Card Availability', icon: 'fuelcard' },
];
const ALL_AUDIT_DEFS = FACILITY_DEFS;

const STORE_BRANDS = ['Waitrose', 'Co-op', 'Tesco', 'Asda', 'M&S', "Sainsbury's Local", 'Spar', 'Independent', 'None'];
const LOCKER_BRANDS = ['Amazon Locker', 'InPost Locker', 'Evri Locker', 'Other', 'None'];
const LOYALTY_PROGRAMS = ['Shell Go+', 'Nectar', 'Tesco Clubcard', 'BP Rewards', 'Esso Extra', 'Morrisons More', 'Asda Rewards', 'Co-op Membership', 'Other', 'None'];
const DROPOFF_SERVICES = ['Evri Drop-off', 'DPD Drop-off', 'Yodel Drop-off', 'UPS Access Point', 'DHL Drop-off', 'Royal Mail Drop-off', 'Other', 'None'];
const DELIVERY_PARTNERS = ['Uber Eats', 'Just Eat', 'Deliveroo', 'Amazon Flex', 'Getir', 'Gorillas', 'Other', 'None'];
const BINARY_TOGGLE_KEYS = ['statusParking', 'statusDisabledParking'];
const WAITING_TIME_OPTIONS = ['No Waiting Time', '30 min', '60 min', '90 min', '120 min'];
const FUEL_CARD_OPTIONS = ['BP Plus', 'Shell CRT/Multifleet', 'Esso Card', 'Texaco Fastfuel', 'Allstar One', 'UK Fuels', 'Fuelplus', 'Keyfuels', 'Esso Multi Network', 'Other', 'None'];
const LOYALTY_COLOR_MAP = {
  'Shell Go+': { bg: '#FFD500', text: '#14140F' }, 'Nectar': { bg: '#E3007D', text: '#fff' },
  'Tesco Clubcard': { bg: '#00539F', text: '#fff' }, 'BP Rewards': { bg: '#00833D', text: '#fff' },
  'Esso Extra': { bg: '#ED1C24', text: '#fff' }, 'Morrisons More': { bg: '#FFD200', text: '#14140F' },
  'Asda Rewards': { bg: '#78BE21', text: '#14140F' }, 'Co-op Membership': { bg: '#00B1E7', text: '#14140F' },
};
const LOCKER_COLOR_MAP = { 'Amazon Locker': { bg: '#FF9900', text: '#14140F' }, 'InPost Locker': { bg: '#FFCC00', text: '#14140F' }, 'Evri Locker': { bg: '#6F2DA8', text: '#fff' } };
const DROPOFF_COLOR_MAP = {
  'Evri Drop-off': { bg: '#6F2DA8', text: '#fff' }, 'DPD Drop-off': { bg: '#DC0032', text: '#fff' },
  'Yodel Drop-off': { bg: '#FFD400', text: '#14140F' }, 'UPS Access Point': { bg: '#351C15', text: '#FFB500' },
  'DHL Drop-off': { bg: '#FFCC00', text: '#D40511' }, 'Royal Mail Drop-off': { bg: '#DA020E', text: '#fff' },
};
const DELIVERY_COLOR_MAP = {
  'Uber Eats': { bg: '#06C167', text: '#fff' }, 'Just Eat': { bg: '#FF8000', text: '#fff' },
  'Deliveroo': { bg: '#00CCBC', text: '#14140F' }, 'Amazon Flex': { bg: '#FF9900', text: '#14140F' },
  'Getir': { bg: '#5D3EBC', text: '#fff' }, 'Gorillas': { bg: '#F2E205', text: '#14140F' },
};
const NEUTRAL_CHIP = { bg: '#9B9B9B', text: '#fff' };
function chipSpecFor(map, name) { return map[name] || NEUTRAL_CHIP; }
function shadeHex(hex, percent) {
  const h = hex.replace('#', '');
  let r = parseInt(h.substring(0, 2), 16), g = parseInt(h.substring(2, 4), 16), b = parseInt(h.substring(4, 6), 16);
  const amt = Math.round(2.55 * percent);
  r = Math.max(0, Math.min(255, r + amt)); g = Math.max(0, Math.min(255, g + amt)); b = Math.max(0, Math.min(255, b + amt));
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
}
function chipGradient(hex) { return `linear-gradient(180deg, ${shadeHex(hex, 18)} 0%, ${hex} 55%, ${shadeHex(hex, -14)} 100%)`; }
const BINARY_OPTIONS = [
  { value: 'available', label: 'Available' },
  { value: 'unknown', label: 'Unknown' },
];
function isFacilityAvailable(key, value, draft) {
  if (key === 'statusConvenienceStore') return STORE_BRANDS.includes(value) && value !== 'None';
  if (key === 'statusParcelLocker') {
    const arr = (draft && draft.parcelLockerBrands) || [];
    return arr.length > 0 && !arr.includes('None');
  }
  if (key === 'statusWaitingTime') return !!value && value !== 'No Waiting Time' && WAITING_TIME_OPTIONS.includes(value);
  if (key === 'statusFuelCard') {
    const arr = (draft && draft.fuelCardAvailability) || [];
    return arr.length > 0 && !arr.includes('None');
  }
  return value === 'available';
}

const STATUS_OPTIONS = [
  { value: 'available', label: 'Available' },
  { value: 'unavailable', label: 'Not Available' },
  { value: 'unknown', label: 'Unknown' },
];
const STATUS_LABELS = { available: 'Available', unavailable: 'Not Available', unknown: 'Unknown' };

const TOILET_DEFS = [
  { key: 'toiletsMen', label: "Men's Toilet", icon: 'men' },
  { key: 'toiletsWomen', label: "Women's Toilet", icon: 'women' },
  { key: 'toiletsDisabled', label: 'Disabled Toilet', icon: 'disabled' },
  { key: 'toiletsBabyChange', label: 'Baby Change', icon: 'baby' },
];
const TOILET_COLORS = { toiletsMen: '#2563EB', toiletsWomen: '#EC4899', toiletsDisabled: '#7C3AED', toiletsBabyChange: '#16A34A' };

const COFFEE_BRANDS = ['Costa Coffee', 'Starbucks', 'Nescafé', 'Greggs', 'Café Nero', 'WHSmith Coffee', 'Other'];
const COFFEE_COLOR_MAP = {
  'Costa Coffee': { bg: '#6F1D26', border: '#6F1D26' },
  'Starbucks': { bg: '#00704A', border: '#00704A' },
  'Nescafé': { bg: '#C8102E', border: '#6F4E37' },
  'Greggs': { bg: '#00539F', border: '#00539F' },
  'Café Nero': { bg: '#1A1A1A', border: '#C8102E' },
  'WHSmith Coffee': { bg: '#004B87', border: '#004B87' },
  'Other': { bg: '#9B9B9B', border: '#9B9B9B' },
};

const BRANDS = ['Shell','BP','Esso','Texaco','Jet','Murco','Applegreen','Asda','Tesco',"Sainsbury's",'Morrisons','MFG','Euro Garages','Independent'];

const BRAND_COLOR_MAP = [
  { key: 'SHELL', bg: '#FFD500', border: '#DD1D21', text: '#14140F' },
  { key: 'BP', bg: '#00A651', border: '#FFC72C', text: '#fff' },
  { key: 'ESSO', bg: '#0033A0', border: '#ED1C24', text: '#fff' },
  { key: 'TEXACO', bg: '#DA291C', border: '#000000', text: '#fff' },
  { key: 'TESCO', bg: '#00539F', border: '#EE1C25', text: '#fff' },
  { key: 'SAINSBURY', bg: '#F06C00', border: '#F06C00', text: '#fff' },
  { key: 'MORRISON', bg: '#FFD200', border: '#00703C', text: '#14140F' },
  { key: 'ASDA', bg: '#78BE20', border: '#78BE20', text: '#fff' },
  { key: 'APPLEGREEN', bg: '#00A651', border: '#FFFFFF', text: '#fff' },
  { key: 'GULF', bg: '#F7941E', border: '#003DA5', text: '#fff' },
  { key: 'JET', bg: '#ED1C24', border: '#FFD200', text: '#fff' },
];

const AUDITORS = [
  { name: 'Hemanth', code: '4821' },
  { name: 'Kranthi', code: '7093' },
  { name: 'Thenu', code: '3567' },
  { name: 'Pravallika', code: '9152' },
];

const STORAGE_KEY = 'urbanCurlew.audits.v1';

/* ---------- helpers ---------- */
function esc(s) { return (s == null ? '' : String(s)).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function haversineMiles(lat1, lng1, lat2, lng2) {
  const R = 3958.8, toRad = d => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1), dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
function toTitleCase(str) { return (str || '').toLowerCase().replace(/\b([a-z])/g, c => c.toUpperCase()); }
function priceRowsFor(s) {
  const pence = v => (v * 100).toFixed(1) + 'p';
  const rows = [];
  if (s.e5 != null) rows.push({ label: 'E5', value: pence(s.e5) });
  if (s.e10 != null) rows.push({ label: 'E10', value: pence(s.e10) });
  if (s.b7 != null) rows.push({ label: 'B7 Diesel', value: pence(s.b7) });
  if (s.b7p != null) rows.push({ label: 'Premium Diesel', value: pence(s.b7p) });
  return rows;
}
function hexToRgba(hex, alpha) {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16), g = parseInt(h.substring(2, 4), 16), b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}
function brandColorFor(raw) {
  const b = (raw || '').toUpperCase();
  const m = BRAND_COLOR_MAP.find(x => b.includes(x.key));
  const spec = m || { bg: '#9B9B9B', border: '#9B9B9B', text: '#fff' };
  const initial = (raw || '?').trim().charAt(0).toUpperCase() || '?';
  return { badgeBg: spec.bg, badgeBorder: spec.border, badgeText: spec.text, badgeInitial: initial };
}
function matchBrand(raw) {
  const u = (raw || '').toUpperCase();
  return BRANDS.find(b => u.includes(b.toUpperCase())) || 'Independent';
}
function iconColorFor(status) {
  if (STORE_BRANDS.includes(status)) return status === 'None' ? '#B3261E' : '#1E7E34';
  return status === 'available' ? '#1E7E34' : status === 'unavailable' ? '#B3261E' : 'rgba(20,20,15,0.45)';
}
function blankDraft() {
  const d = { stationName: '', brandName: 'Shell', postCode: '', notes: '', auditorName: '', coffeeBrands: [], coffeeOther: '', parcelLockerBrands: [], loyaltyPrograms: [], parcelDropoff: [], deliveryPartners: [], deliveryPartnersHours: {}, fuelCardAvailability: [] };
  FACILITY_DEFS.forEach(f => d[f.key] = 'unknown');
  TOILET_DEFS.forEach(t => d[t.key] = false);
  return d;
}
const ICONS = {
  jetwash: '<rect x="9" y="3" width="6" height="4" rx="1"/><path d="M12 7v4"/><path d="M8 20l2-5h4l2 5"/><path d="M15 9l3-2M15 11l3 1M9 9l-3-2M9 11l-3 1"/>',
  carwash: '<path d="M3 16l1.5-4.5A2 2 0 016.4 10h11.2a2 2 0 011.9 1.5L21 16"/><rect x="3" y="16" width="18" height="4" rx="1"/><circle cx="7" cy="20" r="1.2"/><circle cx="17" cy="20" r="1.2"/><path d="M6 7q1-2 2 0t2 0 2 0 2 0 2 0"/>',
  atm: '<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18"/><circle cx="8" cy="14.5" r="1.5"/><path d="M13 14.5h5"/>',
  toilets: '<path d="M8 3h6a2 2 0 012 2v4H6V5a2 2 0 012-2z"/><path d="M6 9h10v2a5 5 0 01-5 5 5 5 0 01-5-5V9z"/><path d="M9 16v3M13 16v3"/>',
  ev: '<path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z"/>',
  carwater: '<path d="M12 3c-2.5 3-4.5 5.5-4.5 8a4.5 4.5 0 009 0c0-2.5-2-5-4.5-8z"/><path d="M6 20h12"/><circle cx="8.5" cy="20" r="1"/><circle cx="15.5" cy="20" r="1"/>',
  water: '<path d="M6 3h12l-1.2 15a2 2 0 01-2 1.8H9.2a2 2 0 01-2-1.8L6 3z"/><path d="M7 8h10"/>',
  coffee: '<path d="M4 8h13v4a5 5 0 01-5 5H9a5 5 0 01-5-5V8z"/><path d="M17 9h2a2 2 0 010 4h-2"/><path d="M8 3q.5 1.5-.5 2.5M12 3q.5 1.5-.5 2.5M16 3q.5 1.5-.5 2.5"/>',
  air: '<circle cx="12" cy="13" r="7"/><path d="M12 13l3-3"/><path d="M12 4v2M6 8l1.4 1.4M18 8l-1.4 1.4"/>',
  adblue: '<path d="M12 3c-2.2 3-4 5.3-4 7.8a4 4 0 008 0c0-2.5-1.8-4.8-4-7.8z"/>',
  calor: '<rect x="8" y="6" width="8" height="14" rx="2"/><rect x="10" y="3" width="4" height="3" rx="1"/><path d="M9 11h6"/>',
  men: '<circle cx="12" cy="5" r="2.2"/><path d="M12 9v7M9 12h6M9 20l3-4 3 4"/>',
  women: '<circle cx="12" cy="5" r="2.2"/><path d="M9 15h6l-2-6h-2z"/><path d="M12 9v3M10 20l1-5M14 20l-1-5"/>',
  disabled: '<circle cx="12" cy="5" r="1.8"/><path d="M12 8v4l4 2"/><circle cx="10" cy="16" r="5"/>',
  baby: '<circle cx="9" cy="6" r="1.8"/><path d="M9 9v4M6 11h6M9 17l-2 3M9 17l2 3"/><path d="M15 14a2 2 0 100-4"/>',
  cupfilled: '<path d="M4 8h13v4a5 5 0 01-5 5H9a5 5 0 01-5-5V8z"/><path d="M17 9h2a2 2 0 010 4h-2"/>',
  csopen: '<rect x="5" y="3" width="10" height="18" rx="1"/><path d="M17 7l3 2v11"/>',
  csclean: '<path d="M12 3l1.5 3.5L17 8l-3.5 1.5L12 13l-1.5-3.5L7 8l3.5-1.5z"/><path d="M5 17l.8 1.8L7.5 19.5 5.8 20.3 5 22l-.8-1.7L2.5 19.5l1.7-.7z"/>',
  csstock: '<rect x="3" y="8" width="7" height="7" rx="1"/><rect x="13" y="8" width="7" height="7" rx="1"/><rect x="8" y="16" width="7" height="4" rx="1"/>',
  cstill: '<rect x="4" y="9" width="16" height="10" rx="1.5"/><path d="M7 9V6a2 2 0 012-2h6a2 2 0 012 2v3"/><path d="M9 13h6"/>',
  csstaff: '<circle cx="12" cy="7" r="3"/><path d="M5 21c0-4 3-7 7-7s7 3 7 7"/>',
  convenience: '<path d="M4 8l1.5-4h13L20 8"/><rect x="4" y="8" width="16" height="12" rx="1"/><path d="M9 12v4M15 12v4"/>',
  parking: '<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M9 16V8h3.5a2.5 2.5 0 010 5H9"/>',
  disabledparking: '<circle cx="12" cy="5" r="1.6"/><path d="M12 8v6l4 5M9 12h6l3 3M9 12L7 20"/><circle cx="9" cy="19" r="2.2"/>',
  parcellocker: '<rect x="4" y="4" width="7" height="7"/><rect x="13" y="4" width="7" height="7"/><rect x="4" y="13" width="7" height="7"/><rect x="13" y="13" width="7" height="7"/>',
};
function svgIcon(name, color, size) {
  size = size || 17;
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICONS[name]}</svg>`;
}

/* ---------- state ---------- */
function loadAudits() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; } catch (e) { return []; }
}
function saveAudits() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state.audits)); }

const state = {
  screen: 'dashboard',
  loggedInAuditor: null,   // fresh every launch — never read from storage
  loginName: '',
  loginCode: '',
  loginError: null,
  showMenu: false,
  audits: loadAudits(),
  search: '',
  auditorFilter: '',
  selectedId: null,
  editingId: null,
  draft: blankDraft(),
  saveError: null,
  exporting: false,
  toast: null,
  deleteConfirm: false,
  expandedFacility: null,
  cloudStatus: 'connecting',
  locStatus: 'idle',
  nearbyResults: [],
  stationQuery: '',
  searchResults: [],
  selectedStationIdx: null,
  selectedStationDist: null,
  favorites: [],
};

function setState(patch) { Object.assign(state, patch); render(); }
function setDraft(field, value) { state.draft = { ...state.draft, [field]: value }; render(); }

/* ---------- actions (exposed globally for inline handlers) ---------- */
const App = {
  handleLoginName(v) { state.loginName = v; state.loginError = null; render(); },
  handleLoginCode(v) { state.loginCode = v; state.loginError = null; render(); },
  doLogin() {
    const auditor = AUDITORS.find(a => a.name === state.loginName);
    if (!auditor || state.loginCode !== auditor.code) {
      setState({ loginError: 'Incorrect code — please try again.' });
      return;
    }
    setState({ loggedInAuditor: auditor.name, loginCode: '', loginError: null, screen: 'dashboard' });
  },
  toggleMenu() { setState({ showMenu: !state.showMenu }); },
  logout() { setState({ loggedInAuditor: null, loginName: '', loginCode: '', showMenu: false, screen: 'dashboard' }); },

  openAdd() {
    const d = blankDraft();
    d.auditorName = state.loggedInAuditor || '';
    setState({ screen: 'form', editingId: null, draft: d, saveError: null });
  },
  openEdit(id) {
    const a = state.audits.find(x => x.id === id);
    if (!a) return;
    setState({ screen: 'form', editingId: id, draft: { ...blankDraft(), ...a }, saveError: null });
  },
  editSelected() {
    const a = state.audits.find(x => x.id === state.selectedId);
    if (!a || a.auditorName !== state.loggedInAuditor) return;
    App.openEdit(state.selectedId);
  },
  openCard(id) { setState({ screen: 'detail', selectedId: id, deleteConfirm: false }); },
  backToDashboard() { setState({ screen: 'dashboard' }); },
  openNearby() { setState({ screen: 'nearby' }); },
  backToNearby() { setState({ screen: 'nearby' }); },

  setSearch(v) { setState({ search: v }); },
  setAuditorFilter(v) { setState({ auditorFilter: v }); },
  handleStationName(v) { setDraft('stationName', v); },
  handlePostCode(v) { setDraft('postCode', v.toUpperCase()); },
  handleNotes(v) { setDraft('notes', v); },
  selectBrand(name) { setDraft('brandName', name); },
  handleCoffeeOther(v) { setDraft('coffeeOther', v); },
  toggleLockerBrand(name) {
    const current = state.draft.parcelLockerBrands || [];
    let next;
    if (name === 'None') { next = current.includes('None') ? [] : ['None']; }
    else { const w = current.filter(b => b !== 'None'); next = w.includes(name) ? w.filter(b => b !== name) : [...w, name]; }
    setDraft('parcelLockerBrands', next);
  },
  toggleFuelCard(name) {
    const current = state.draft.fuelCardAvailability || [];
    let next;
    if (name === 'None') { next = current.includes('None') ? [] : ['None']; }
    else { const w = current.filter(b => b !== 'None'); next = w.includes(name) ? w.filter(b => b !== name) : [...w, name]; }
    setDraft('fuelCardAvailability', next);
  },
  toggleLoyaltyProgram(name) {
    const current = state.draft.loyaltyPrograms || [];
    let next;
    if (name === 'None') { next = current.includes('None') ? [] : ['None']; }
    else { const w = current.filter(b => b !== 'None'); next = w.includes(name) ? w.filter(b => b !== name) : [...w, name]; }
    setDraft('loyaltyPrograms', next);
  },
  toggleDropoffService(name) {
    const current = state.draft.parcelDropoff || [];
    let next;
    if (name === 'None') { next = current.includes('None') ? [] : ['None']; }
    else { const w = current.filter(b => b !== 'None'); next = w.includes(name) ? w.filter(b => b !== name) : [...w, name]; }
    setDraft('parcelDropoff', next);
  },
  toggleDeliveryPartner(name) {
    const current = state.draft.deliveryPartners || [];
    const hours = { ...(state.draft.deliveryPartnersHours || {}) };
    let next;
    if (name === 'None') {
      if (current.includes('None')) { next = []; }
      else { next = ['None']; current.forEach(n => delete hours[n]); }
    } else {
      const w = current.filter(b => b !== 'None');
      if (w.includes(name)) { next = w.filter(b => b !== name); delete hours[name]; }
      else { next = [...w, name]; }
      if (current.includes('None')) delete hours['None'];
    }
    setDraft('deliveryPartners', next);
    setDraft('deliveryPartnersHours', hours);
  },
  setDeliveryHoursType(name, type) {
    const hours = { ...(state.draft.deliveryPartnersHours || {}) };
    hours[name] = type === '24/7' ? { type: '24/7' } : { type: 'set', start: (hours[name] && hours[name].start) || '', end: (hours[name] && hours[name].end) || '' };
    setDraft('deliveryPartnersHours', hours);
  },
  handleDeliveryHoursStart(name, val) {
    const hours = { ...(state.draft.deliveryPartnersHours || {}) };
    hours[name] = { ...(hours[name] || { type: 'set' }), type: 'set', start: val };
    setDraft('deliveryPartnersHours', hours);
  },
  handleDeliveryHoursEnd(name, val) {
    const hours = { ...(state.draft.deliveryPartnersHours || {}) };
    hours[name] = { ...(hours[name] || { type: 'set' }), type: 'set', end: val };
    setDraft('deliveryPartnersHours', hours);
  },

  toggleExpand(key) { setState({ expandedFacility: state.expandedFacility === key ? null : key }); },
  setFacilityStatus(key, value) { state.draft = { ...state.draft, [key]: value }; render(); },
  toggleToiletOption(key) { state.draft = { ...state.draft, [key]: !state.draft[key] }; render(); },
  toggleCoffeeBrand(name) {
    const cur = state.draft.coffeeBrands || [];
    state.draft = { ...state.draft, coffeeBrands: cur.includes(name) ? cur.filter(b => b !== name) : [...cur, name] };
    render();
  },

  saveDraft() {
    const { draft, editingId, audits, loggedInAuditor } = state;
    if (!draft.stationName.trim() || !draft.postCode.trim() || !loggedInAuditor) return;
    if (editingId) {
      const existing = audits.find(a => a.id === editingId);
      if (!existing || existing.auditorName !== loggedInAuditor) {
        setState({ saveError: `Only ${existing ? existing.auditorName : 'the original auditor'} can modify this audit.` });
        return;
      }
    }
    const clean = { ...draft, auditorName: loggedInAuditor };
    const useCloud = state.cloudStatus === 'connected' && window.__supabase;
    if (editingId) {
      const existing = audits.find(a => a.id === editingId);
      const updated = { ...clean, auditDate: existing ? existing.auditDate : today() };
      if (useCloud) {
        window.__supabase.update(editingId, updated).catch(err => console.warn('Cloud save failed, keeping local session copy:', err));
      } else {
        state.audits = audits.map(a => a.id === editingId ? { ...updated, id: editingId } : a);
        saveAudits();
      }
    } else {
      const newAudit = { ...clean, auditDate: today() };
      if (useCloud) {
        window.__supabase.insert(newAudit).catch(err => console.warn('Cloud save failed, keeping local session copy:', err));
      } else {
        state.audits = [{ ...newAudit, id: Date.now() }, ...audits];
        saveAudits();
      }
    }
    setState({ saveError: null, screen: 'dashboard' });
  },
  confirmDeleteToggle() {
    const a = state.audits.find(x => x.id === state.selectedId);
    if (!a || a.auditorName !== state.loggedInAuditor) return;
    setState({ deleteConfirm: !state.deleteConfirm });
  },
  deleteSelected() {
    const a = state.audits.find(x => x.id === state.selectedId);
    if (!a || a.auditorName !== state.loggedInAuditor) return;
    const useCloud = state.cloudStatus === 'connected' && window.__supabase;
    if (useCloud) {
      window.__supabase.remove(a.id).catch(err => console.warn('Cloud delete failed:', err));
    } else {
      state.audits = state.audits.filter(x => x.id !== state.selectedId);
      saveAudits();
    }
    setState({ screen: 'dashboard', deleteConfirm: false });
  },

  exportExcel() {
    setState({ exporting: true });
    clearTimeout(App._exportTimer);
    App._exportTimer = setTimeout(() => {
      const fname = `Urban_Curlew_Station_Audits_${new Date().toISOString().slice(0, 10)}.csv`;
      downloadCsv(fname);
      setState({ exporting: false, toast: fname });
      clearTimeout(App._toastTimer);
      App._toastTimer = setTimeout(() => setState({ toast: null }), 3200);
    }, 800);
  },

  handleStationQuery(v) {
    state.stationQuery = v;
    const nq = v.trim().toLowerCase();
    if (!nq) { state.searchResults = []; render(); return; }
    const nqPc = nq.replace(/\s+/g, '');
    const matches = (window.FUEL_STATIONS || [])
      .map((s, idx) => ({ ...s, idx }))
      .filter(s => s.n.toLowerCase().includes(nq) || s.pc.toLowerCase().replace(/\s+/g, '').includes(nqPc))
      .slice(0, 30)
      .map(s => ({ ...s, nameDisplay: toTitleCase(s.n), priceRows: priceRowsFor(s), ...brandColorFor(s.b) }));
    state.searchResults = matches;
    render();
  },

  findMyLocation() {
    setState({ locStatus: 'locating' });
    if (!navigator.geolocation) { setState({ locStatus: 'error' }); return; }
    navigator.geolocation.getCurrentPosition(
      pos => computeNearby(pos.coords.latitude, pos.coords.longitude),
      () => setState({ locStatus: 'error' }),
      { timeout: 8000, enableHighAccuracy: true }
    );
  },

  viewStationDetail(idx, dist) { setState({ screen: 'stationDetail', selectedStationIdx: idx, selectedStationDist: dist || null }); },
  toggleFavorite(idx, evt) {
    if (evt) evt.stopPropagation();
    state.favorites = state.favorites.includes(idx) ? state.favorites.filter(x => x !== idx) : [...state.favorites, idx];
    render();
  },
  startAuditFromNearby(idx, evt) {
    if (evt) evt.stopPropagation();
    const s = (window.FUEL_STATIONS || [])[idx];
    if (!s) return;
    const d = blankDraft();
    d.auditorName = state.loggedInAuditor || '';
    d.stationName = toTitleCase(s.n);
    d.brandName = matchBrand(s.b);
    d.postCode = s.pc;
    d.statusAdBlue = s.adblue ? 'available' : 'unavailable';
    d.statusCarWash = s.carwash ? 'available' : 'unavailable';
    d.statusAirMachine = s.air ? 'available' : 'unavailable';
    d.statusToilets = s.toilets ? 'available' : 'unavailable';
    d.statusDrinkingWater = s.water ? 'available' : 'unavailable';
    d.statusCarWater = s.water ? 'available' : 'unavailable';
    setState({ draft: d, editingId: null, screen: 'form' });
  },
};
window.App = App;

function today() { return new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }); }

function computeNearby(lat, lng) {
  const stations = window.FUEL_STATIONS || [];
  const withDist = stations.map((s, idx) => ({ ...s, idx, dist: haversineMiles(lat, lng, s.lat, s.lng) }));
  withDist.sort((a, b) => a.dist - b.dist);
  const top = withDist.slice(0, 20).map(s => ({ ...s, nameDisplay: toTitleCase(s.n), distStr: s.dist.toFixed(1), priceRows: priceRowsFor(s), ...brandColorFor(s.b) }));
  setState({ locStatus: 'ready', nearbyResults: top });
}

function downloadCsv(filename) {
  const rows = [['Station','Brand','Postcode','Auditor','Date','Facilities Available','Notes']];
  state.audits.forEach(a => {
    const count = ALL_AUDIT_DEFS.filter(f => isFacilityAvailable(f.key, a[f.key], a)).length;
    rows.push([a.stationName, a.brandName, a.postCode, a.auditorName, a.auditDate, `${count}/${ALL_AUDIT_DEFS.length}`, (a.notes||'').replace(/\n/g,' ')]);
  });
  const csv = rows.map(r => r.map(c => `"${String(c||'').replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url; link.download = filename; link.click();
  URL.revokeObjectURL(url);
}

/* ---------- render helpers ---------- */
function facilityIconWrap(icon, color) {
  return `<div style="width:32px;height:32px;border-radius:50%;background:#ECE9DC;display:flex;align-items:center;justify-content:center;flex-shrink:0;">${svgIcon(icon, color)}</div>`;
}
function brandBadge(colors, size) {
  size = size || 16;
  return `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${colors.badgeBg};border:2px solid ${colors.badgeBorder};display:flex;align-items:center;justify-content:center;flex-shrink:0;">
    <span style="font-size:${Math.round(size*0.5)}px;font-weight:800;color:${colors.badgeText};">${esc(colors.badgeInitial)}</span>
  </div>`;
}

function renderLogin() {
  return `<div class="screen" style="align-items:center;justify-content:center;background:#FCE36B;padding:32px;box-sizing:border-box;">
    <div style="display:flex;flex-direction:column;align-items:center;gap:24px;width:100%;">
      <div style="display:flex;flex-direction:column;align-items:center;gap:8px;">
        <svg width="44" height="44" viewBox="0 0 32 32" fill="none"><path d="M9 20c0-6 5-11 11-11 2 0 3 1 3 2s-2 1-3 1c-4 0-7 3-8 7l7 2-1 3-9-2c-1 0-2-1-2-2z" fill="#1E7E34"/><circle cx="12" cy="14" r="1.2" fill="#FCE36B"/></svg>
        <div style="font-size:22px;font-weight:800;color:#14140F;letter-spacing:-0.2px;">Urban Curlew</div>
        <div style="font-size:10px;font-weight:700;color:#1E7E34;letter-spacing:0.6px;text-transform:uppercase;">Know Before You Go</div>
      </div>
      <div style="background:#fff;border-radius:16px;padding:22px;width:100%;max-width:320px;box-sizing:border-box;display:flex;flex-direction:column;gap:14px;">
        <div style="font-size:15px;font-weight:700;color:#14140F;text-align:center;">Auditor Login</div>
        ${state.loginError ? `<div style="background:#F1DAD7;color:#B3261E;border-radius:10px;padding:10px 13px;font-size:12.5px;font-weight:600;text-align:center;">${esc(state.loginError)}</div>` : ''}
        <div style="display:flex;flex-direction:column;gap:6px;">
          <label class="label">Select Your Name</label>
          <select class="text-input" onchange="App.handleLoginName(this.value)">
            <option value="">Select Name</option>
            ${AUDITORS.map(a => `<option value="${esc(a.name)}" ${state.loginName===a.name?'selected':''}>${esc(a.name)}</option>`).join('')}
          </select>
        </div>
        <div style="display:flex;flex-direction:column;gap:6px;">
          <label class="label">Enter Your Code</label>
          <input class="text-input" type="password" inputmode="numeric" maxlength="4" style="letter-spacing:4px;" data-focus-key="loginCode" value="${esc(state.loginCode)}" oninput="App.handleLoginCode(this.value)" placeholder="4-digit code"/>
        </div>
        ${state.loginName && state.loginCode
          ? `<button onclick="App.doLogin()" style="background:#1E7E34;color:#fff;border:none;border-radius:10px;padding:13px;font-size:14px;font-weight:700;cursor:pointer;">Log In</button>`
          : `<button class="btn-disabled" style="width:100%;box-sizing:border-box;padding:13px;border-radius:10px;">Log In</button>`}
      </div>
    </div>
  </div>`;
}

function renderHeader() {
  const audited = new Set(state.audits.map(a => (a.postCode||'').trim().toUpperCase())).size;
  const total = (window.FUEL_STATIONS || []).length;
  const pct = total > 0 ? Math.min(100, Math.round((audited/total)*1000)/10) : 0;
  const auditorNames = [...new Set(state.audits.map(a => a.auditorName).filter(Boolean))].sort();
  return `
  <div class="header-yellow">
    <div style="display:flex;align-items:center;justify-content:space-between;">
      <div style="display:flex;align-items:center;gap:8px;">
        <svg width="26" height="26" viewBox="0 0 32 32" fill="none"><path d="M9 20c0-6 5-11 11-11 2 0 3 1 3 2s-2 1-3 1c-4 0-7 3-8 7l7 2-1 3-9-2c-1 0-2-1-2-2z" fill="#1E7E34"/><circle cx="12" cy="14" r="1.2" fill="#FCE36B"/></svg>
        <div>
          <div style="font-size:17px;font-weight:800;color:#14140F;letter-spacing:-0.2px;line-height:1.1;">Urban Curlew</div>
          <div style="font-size:9px;font-weight:700;color:#1E7E34;letter-spacing:0.6px;text-transform:uppercase;margin-top:1px;">Know Before You Go</div>
        </div>
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:2px;">
      <div style="display:flex;gap:8px;">
        <button class="icon-btn" onclick="App.openNearby()"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#14140F" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-7-6.2-7-11a7 7 0 0114 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.4"/></svg></button>
        <button class="icon-btn" onclick="App.exportExcel()">${state.exporting
          ? '<svg style="animation:uc-spin 0.8s linear infinite;" width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="#14140F" stroke-width="2.5" stroke-dasharray="30 14" stroke-linecap="round"/></svg>'
          : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#14140F" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12M7 10l5 5 5-5M5 21h14"/></svg>'}</button>
        <div style="position:relative;">
          <button class="icon-btn" style="background:#14140F;" onclick="App.toggleMenu()"><span style="font-size:13px;font-weight:800;color:#FCE36B;">${esc((state.loggedInAuditor||'?').charAt(0))}</span></button>
          ${state.showMenu ? `<div style="position:absolute;top:44px;right:0;background:#fff;border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,0.2);padding:6px;min-width:150px;z-index:10;">
            <div style="font-size:11px;color:rgba(20,20,15,0.45);padding:8px 10px 4px;">Logged in as ${esc(state.loggedInAuditor)}</div>
            <button onclick="App.logout()" style="width:100%;text-align:left;background:none;border:none;padding:8px 10px;font-size:13px;font-weight:600;color:#B3261E;cursor:pointer;border-radius:6px;">Log Out</button>
          </div>` : ''}
        </div>
      </div>
      <span style="font-size:9px;font-weight:700;color:${state.cloudStatus === 'connected' ? '#1E7E34' : (state.cloudStatus === 'connecting' ? 'rgba(20,20,15,0.4)' : '#B3261E')};text-transform:uppercase;letter-spacing:0.3px;">${state.cloudStatus === 'connected' ? '\u2601 Synced to cloud' : (state.cloudStatus === 'connecting' ? '\u2601 Connecting...' : '\u26a0 Local session only')}</span>
      </div>
    </div>
    <div style="background:#fff;border-radius:12px;padding:12px 14px;display:flex;flex-direction:column;gap:8px;">
      <div style="display:flex;justify-content:space-between;align-items:baseline;">
        <span style="font-size:12px;font-weight:700;color:#14140F;">${audited} of ${total.toLocaleString()} stations audited</span>
        <span style="font-size:13px;font-weight:800;color:#1E7E34;">${pct}%</span>
      </div>
      <div style="width:100%;height:8px;border-radius:5px;background:#ECE9DC;overflow:hidden;">
        <div style="height:100%;border-radius:5px;background:#1E7E34;width:${pct}%;transition:width 0.3s ease;"></div>
      </div>
    </div>
    <div style="background:#fff;border-radius:12px;padding:14px;display:flex;flex-direction:column;gap:10px;">
      <div style="font-size:11px;font-weight:700;color:rgba(20,20,15,0.5);text-transform:uppercase;letter-spacing:0.4px;">Analytics</div>
      <div style="font-size:15px;font-weight:800;color:#14140F;">Total Audits Completed: ${state.audits.length}</div>
      <div style="display:flex;flex-direction:column;gap:10px;">
        ${Object.entries(state.audits.reduce((acc, a) => { acc[a.auditorName] = (acc[a.auditorName] || 0) + 1; return acc; }, {}))
          .sort((a, b) => b[1] - a[1])
          .map(([name, count]) => {
            const abPct = total > 0 ? Math.min(100, Math.round((count / total) * 1000) / 10) : 0;
            return `<div style="display:flex;flex-direction:column;gap:5px;padding:8px 10px;background:#F7F5EC;border-radius:8px;">
              <div style="display:flex;align-items:baseline;justify-content:space-between;">
                <span style="font-size:13px;font-weight:600;color:#14140F;">${esc(name)}</span>
                <span style="font-size:11.5px;font-weight:700;color:#1E7E34;">${count.toLocaleString()} / ${total.toLocaleString()} — ${abPct.toFixed(1)}%</span>
              </div>
              <div style="width:100%;height:6px;border-radius:4px;background:#ECE9DC;overflow:hidden;">
                <div style="height:100%;border-radius:4px;background:#1E7E34;width:${abPct}%;transition:width 0.3s ease;"></div>
              </div>
            </div>`;
          }).join('')}
      </div>
    </div>
    <input class="text-input" style="border:none;" data-focus-key="dashSearch" value="${esc(state.search)}" oninput="App.setSearch(this.value)" placeholder="Search by station, brand or postcode"/>
    ${auditorNames.length ? `
    <select class="text-input" style="border:none;" onchange="App.setAuditorFilter(this.value)">
      <option value="">All Auditors</option>
      ${auditorNames.map(n => `<option value="${esc(n)}" ${state.auditorFilter===n?'selected':''}>${esc(n)}</option>`).join('')}
    </select>` : ''}
  </div>`;
}

function renderDashboard() {
  const q = state.search.trim().toLowerCase();
  const filtered = state.audits.filter(a => {
    const mQ = !q || a.stationName.toLowerCase().includes(q) || a.brandName.toLowerCase().includes(q) || a.postCode.toLowerCase().includes(q);
    const mA = !state.auditorFilter || a.auditorName === state.auditorFilter;
    return mQ && mA;
  }).sort((a,b) => b.id - a.id);

  const cards = filtered.length === 0
    ? `<div style="text-align:center;padding:60px 20px;color:rgba(20,20,15,0.4);font-size:13px;line-height:1.5;">No audits yet — search for a nearby station to get started.</div>`
    : filtered.map(a => {
        const colors = brandColorFor(a.brandName);
        const count = ALL_AUDIT_DEFS.filter(f => isFacilityAvailable(f.key, a[f.key], a)).length;
        return `<div class="card" onclick="App.openCard(${a.id})">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;">
            <div style="min-width:0;">
              <div style="font-size:15px;font-weight:700;color:#14140F;">${esc(a.stationName)}</div>
              <div style="display:flex;align-items:center;gap:6px;margin-top:2px;">
                ${brandBadge(colors)}
                <span style="font-size:12.5px;color:rgba(20,20,15,0.55);">${esc(a.brandName)} · ${esc(a.postCode)}</span>
              </div>
            </div>
            <div style="font-size:11px;font-weight:700;color:#1E7E34;background:rgba(30,126,52,0.1);padding:4px 8px;border-radius:8px;white-space:nowrap;flex-shrink:0;">${count}/${ALL_AUDIT_DEFS.length}</div>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px;">
            <div style="font-size:11.5px;color:rgba(20,20,15,0.4);">Audited ${esc(a.auditDate)}</div>
            <div style="font-size:10.5px;font-weight:600;color:#1E7E34;background:rgba(30,126,52,0.08);padding:2px 8px;border-radius:6px;">Audited by: ${esc(a.auditorName)}</div>
          </div>
        </div>`;
      }).join('');

  return `<div class="screen">
    ${renderHeader()}
    <div class="scroll" style="padding:14px 16px 90px;display:flex;flex-direction:column;gap:10px;position:relative;">
      ${cards}
    </div>
    ${state.toast ? `<div style="position:absolute;bottom:90px;left:16px;right:16px;background:#14140F;color:#fff;padding:12px 14px;border-radius:12px;font-size:12.5px;display:flex;align-items:center;gap:8px;box-shadow:0 8px 24px rgba(0,0,0,0.25);">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FCE36B" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
      <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">Exported ${esc(state.toast)} — ready to share</span>
    </div>` : ''}
    <button class="fab" onclick="App.openAdd()"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg></button>
  </div>`;
}

function checklistHtml(options, selected, handlerName, colorMap) {
  return `<div style="background:#fff;border:1px solid rgba(20,20,15,0.12);border-radius:12px;padding:10px 12px;display:flex;flex-direction:column;gap:6px;">${options.map(name => {
    const checked = selected.includes(name);
    const spec = chipSpecFor(colorMap || {}, name);
    const tint = hexToRgba(spec.bg, 0.14);
    const grad = chipGradient(spec.bg);
    return `<div onclick="App.${handlerName}('${name.replace(/'/g,"\\'")}')" style="display:flex;align-items:center;gap:9px;padding:6px 8px;border-radius:8px;cursor:pointer;background:${tint};transition:background 180ms ease, box-shadow 180ms ease, transform 150ms ease;">
      ${checked ? `<div style="width:18px;height:18px;border-radius:5px;background:${grad};box-shadow:0 3px 6px ${tint}, inset 0 1px 0 rgba(255,255,255,0.4);display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all 180ms ease;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="${spec.text}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg></div>` : `<div style="width:18px;height:18px;border-radius:4px;border:1.5px solid ${spec.bg};flex-shrink:0;"></div>`}
      <span style="font-size:13px;font-weight:600;color:${spec.bg};">${esc(name)}</span>
    </div>`;
  }).join('')}</div>`;
}
function badgeHtml(chips) {
  return `<div style="display:flex;flex-wrap:wrap;gap:6px;">${chips.map(c => `<div style="padding:5px 12px;border-radius:20px;font-size:12px;font-weight:600;background:${c.grad};color:${c.text};box-shadow:0 3px 6px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.35);transition:all 180ms ease;">${esc(c.label)}</div>`).join('')}</div>`;
}

function deliveryPartnersFormHtml(draft) {
  const selected = draft.deliveryPartners || [];
  const hoursMap = draft.deliveryPartnersHours || {};
  return `<div style="background:#fff;border:1px solid rgba(20,20,15,0.12);border-radius:12px;padding:10px 12px;display:flex;flex-direction:column;gap:6px;">${DELIVERY_PARTNERS.map(name => {
    const checked = selected.includes(name);
    const spec = chipSpecFor(DELIVERY_COLOR_MAP, name);
    const tint = hexToRgba(spec.bg, 0.14);
    const grad = chipGradient(spec.bg);
    const showHours = checked && name !== 'Other' && name !== 'None';
    const hrs = hoursMap[name] || {};
    const is247 = hrs.type === '24/7', isSet = hrs.type === 'set';
    let hoursPanel = '';
    if (showHours) {
      hoursPanel = `<div style="margin:4px 0 2px 27px;padding:8px 10px;background:${tint};border-radius:8px;display:flex;flex-direction:column;gap:6px;">
        <div style="display:flex;gap:6px;">
          <div onclick="App.setDeliveryHoursType('${name.replace(/'/g,"\\'")}','24/7')" style="flex:1;text-align:center;padding:6px 4px;border-radius:7px;font-size:11px;font-weight:700;cursor:pointer;transition:all 180ms ease;background:${is247 ? grad : '#fff'};color:${is247 ? spec.text : spec.bg};box-shadow:${is247 ? '0 2px 5px rgba(0,0,0,0.15)' : 'none'};">24/7</div>
          <div onclick="App.setDeliveryHoursType('${name.replace(/'/g,"\\'")}','set')" style="flex:1;text-align:center;padding:6px 4px;border-radius:7px;font-size:11px;font-weight:700;cursor:pointer;transition:all 180ms ease;background:${isSet ? grad : '#fff'};color:${isSet ? spec.text : spec.bg};box-shadow:${isSet ? '0 2px 5px rgba(0,0,0,0.15)' : 'none'};">Set Hours</div>
        </div>
        ${isSet ? `<div style="display:flex;align-items:center;gap:6px;">
          <input type="time" value="${esc(hrs.start||'')}" onchange="App.handleDeliveryHoursStart('${name.replace(/'/g,"\\'")}', this.value)" style="flex:1;border:1px solid rgba(20,20,15,0.15);border-radius:6px;padding:6px 8px;font-size:12px;color:#14140F;background:#fff;"/>
          <span style="font-size:11px;color:rgba(20,20,15,0.5);">to</span>
          <input type="time" value="${esc(hrs.end||'')}" onchange="App.handleDeliveryHoursEnd('${name.replace(/'/g,"\\'")}', this.value)" style="flex:1;border:1px solid rgba(20,20,15,0.15);border-radius:6px;padding:6px 8px;font-size:12px;color:#14140F;background:#fff;"/>
        </div>` : ''}
      </div>`;
    }
    return `<div>
      <div onclick="App.toggleDeliveryPartner('${name.replace(/'/g,"\\'")}')" style="display:flex;align-items:center;gap:9px;padding:6px 8px;border-radius:8px;cursor:pointer;background:${tint};transition:background 180ms ease, box-shadow 180ms ease, transform 150ms ease;">
        ${checked ? `<div style="width:18px;height:18px;border-radius:5px;background:${grad};box-shadow:0 3px 6px ${tint}, inset 0 1px 0 rgba(255,255,255,0.4);display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all 180ms ease;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="${spec.text}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg></div>` : `<div style="width:18px;height:18px;border-radius:4px;border:1.5px solid ${spec.bg};flex-shrink:0;"></div>`}
        <span style="font-size:13px;font-weight:600;color:${spec.bg};">${esc(name)}</span>
      </div>
      ${hoursPanel}
    </div>`;
  }).join('')}</div>`;
}

function facilityRowHtml(def) {
  const status = state.draft[def.key];
  const expanded = state.expandedFacility === def.key;
  const isToilets = def.key === 'statusToilets', isCoffee = def.key === 'statusCoffee';
  const isStorePicker = def.key === 'statusConvenienceStore';
  const isMultiLocker = def.key === 'statusParcelLocker';
  const isWaitingTime = def.key === 'statusWaitingTime';
  const isFuelCard = def.key === 'statusFuelCard';
  const isBinary = BINARY_TOGGLE_KEYS.includes(def.key);
  const lockerSelected = state.draft.parcelLockerBrands || [];
  const fuelCardSelected = state.draft.fuelCardAvailability || [];
  let expandedHtml = '';
  if (expanded) {
    let statusBtns;
    if (isMultiLocker) {
      statusBtns = `<div style="display:flex;flex-direction:column;gap:6px;">${LOCKER_BRANDS.map(name => {
        const checked = lockerSelected.includes(name);
        const spec = chipSpecFor(LOCKER_COLOR_MAP, name);
        const tint = hexToRgba(spec.bg, 0.14);
        const grad = chipGradient(spec.bg);
        return `<div onclick="App.toggleLockerBrand('${name.replace(/'/g,"\\'")}')" style="display:flex;align-items:center;gap:9px;padding:6px 8px;border-radius:8px;cursor:pointer;background:${tint};transition:background 180ms ease, box-shadow 180ms ease, transform 150ms ease;">
          ${checked ? `<div style="width:18px;height:18px;border-radius:5px;background:${grad};box-shadow:0 3px 6px ${tint}, inset 0 1px 0 rgba(255,255,255,0.4);display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all 180ms ease;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="${spec.text}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg></div>` : `<div style="width:18px;height:18px;border-radius:4px;border:1.5px solid ${spec.bg};flex-shrink:0;"></div>`}
          <span style="font-size:13px;font-weight:600;color:${spec.bg};">${esc(name)}</span>
        </div>`;
      }).join('')}</div>`;
    } else if (isStorePicker) {
      statusBtns = STORE_BRANDS.map(name => {
        const sel = status === name;
        return `<div onclick="App.setFacilityStatus('${def.key}','${name.replace(/'/g,"\\'")}')" style="padding:8px 14px;border-radius:20px;font-size:12.5px;cursor:pointer;${sel ? 'background:#1E7E34;color:#fff;font-weight:600;' : 'background:#fff;border:1px solid rgba(20,20,15,0.15);color:#14140F;font-weight:500;'}">${esc(name)}</div>`;
      }).join('');
      statusBtns = `<div style="display:flex;flex-wrap:wrap;gap:8px;">${statusBtns}</div>`;
    } else if (isWaitingTime) {
      statusBtns = WAITING_TIME_OPTIONS.map(name => {
        const sel = status === name;
        return `<div onclick="App.setFacilityStatus('${def.key}','${name.replace(/'/g,"\\'")}')" style="padding:8px 14px;border-radius:20px;font-size:12.5px;cursor:pointer;${sel ? 'background:#1E7E34;color:#fff;font-weight:600;' : 'background:#fff;border:1px solid rgba(20,20,15,0.15);color:#14140F;font-weight:500;'}">${esc(name)}</div>`;
      }).join('');
      statusBtns = `<div style="display:flex;flex-wrap:wrap;gap:8px;">${statusBtns}</div>`;
    } else if (isFuelCard) {
      statusBtns = `<div style="display:flex;flex-direction:column;gap:6px;">${FUEL_CARD_OPTIONS.map(name => {
        const checked = fuelCardSelected.includes(name);
        return `<div onclick="App.toggleFuelCard('${name.replace(/'/g,"\\'")}')" style="display:flex;align-items:center;gap:9px;padding:6px 4px;cursor:pointer;">
          ${checked ? `<div style="width:18px;height:18px;border-radius:4px;background:#1E7E34;display:flex;align-items:center;justify-content:center;flex-shrink:0;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg></div>` : `<div style="width:18px;height:18px;border-radius:4px;border:1.5px solid rgba(20,20,15,0.25);flex-shrink:0;"></div>`}
          <span style="font-size:13px;color:#14140F;">${esc(name)}</span>
        </div>`;
      }).join('')}</div>`;
    } else {
      statusBtns = (isBinary ? BINARY_OPTIONS : STATUS_OPTIONS).map(o => {
        const sel = status === o.value;
        return `<div onclick="App.setFacilityStatus('${def.key}','${o.value}')" style="flex:1;text-align:center;padding:7px 4px;border-radius:8px;cursor:pointer;font-size:11px;font-weight:700;${sel ? 'background:#14140F;color:#fff;' : 'background:#F7F5EC;border:1px solid rgba(20,20,15,0.12);color:rgba(20,20,15,0.55);font-weight:600;'}">${o.label}</div>`;
      }).join('');
      statusBtns = `<div style="display:flex;gap:6px;">${statusBtns}</div>`;
    }
    let sub = '';
    if (isToilets && status === 'available') {
      sub = `<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;padding-top:8px;border-top:1px solid rgba(20,20,15,0.08);">
        ${TOILET_DEFS.map(t => {
          const checked = !!state.draft[t.key];
          const c = TOILET_COLORS[t.key];
          const tint = hexToRgba(c, 0.14);
          return `<div onclick="App.toggleToiletOption('${t.key}')" style="display:flex;flex-direction:column;align-items:center;gap:4px;padding:8px 4px;border-radius:10px;cursor:pointer;${checked ? `background:${c};` : `background:${tint};border:1px solid ${tint};`}">
            ${svgIcon(t.icon, checked ? '#fff' : c, 20)}
            <span style="font-size:8.5px;font-weight:600;text-align:center;line-height:1.2;color:${checked ? '#fff' : c};">${t.label}</span>
          </div>`;
        }).join('')}
      </div>`;
    }
    if (isCoffee && status === 'available') {
      const brands = state.draft.coffeeBrands || [];
      sub = `<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;padding-top:8px;border-top:1px solid rgba(20,20,15,0.08);">
        ${COFFEE_BRANDS.map(name => {
          const checked = brands.includes(name);
          const spec = COFFEE_COLOR_MAP[name];
          const tint = hexToRgba(spec.bg, 0.14);
          return `<div onclick="App.toggleCoffeeBrand('${name.replace(/'/g,"\\'")}')" style="display:flex;flex-direction:column;align-items:center;gap:4px;padding:8px 4px;border-radius:10px;cursor:pointer;${checked ? `background:${spec.bg};border:2px solid ${spec.border};` : `background:${tint};border:1.5px solid ${spec.bg};`}">
            ${svgIcon('cupfilled', checked ? '#fff' : spec.bg, 18)}
            <span style="font-size:8px;font-weight:600;text-align:center;line-height:1.2;color:${checked ? '#fff' : spec.bg};">${esc(name)}</span>
          </div>`;
        }).join('')}
      </div>
      ${brands.includes('Other') ? `<input class="text-input" style="margin-top:6px;font-size:12.5px;padding:8px 10px;" data-focus-key="coffeeOther" value="${esc(state.draft.coffeeOther)}" oninput="App.handleCoffeeOther(this.value)" placeholder="Enter brand name"/>` : ''}`;
    }
    expandedHtml = `<div style="padding:0 12px 12px;display:flex;flex-direction:column;gap:10px;">
      ${statusBtns}
      ${sub}
    </div>`;
  }
  return `<div style="background:#fff;border:1px solid rgba(20,20,15,0.12);border-radius:12px;overflow:hidden;">
    <div onclick="App.toggleExpand('${def.key}')" style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:10px 12px;cursor:pointer;">
      <div style="display:flex;align-items:center;gap:8px;min-width:0;">
        ${facilityIconWrap(def.icon, isMultiLocker ? (lockerSelected.length ? (lockerSelected.includes('None') ? '#B3261E' : '#1E7E34') : 'rgba(20,20,15,0.45)') : (isFuelCard ? (fuelCardSelected.length ? (fuelCardSelected.includes('None') ? '#B3261E' : '#1E7E34') : 'rgba(20,20,15,0.45)') : iconColorFor(status)))}
        <span style="font-size:12.5px;color:#14140F;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${def.label}</span>
        <span style="font-size:10.5px;color:rgba(20,20,15,0.4);white-space:nowrap;">${isMultiLocker ? (lockerSelected.length ? esc(lockerSelected.join(', ')) : 'Unknown') : (isFuelCard ? (fuelCardSelected.length ? esc(fuelCardSelected.join(', ')) : 'Unknown') : ((isStorePicker || isWaitingTime) ? (status ? esc(status) : 'Unknown') : STATUS_LABELS[status]))}</span>
      </div>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(20,20,15,0.4)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;">${expanded ? '<path d="M18 15l-6-6-6 6"/>' : '<path d="M6 9l6 6 6-6"/>'}</svg>
    </div>
    ${expandedHtml}
  </div>`;
}

function renderForm() {
  const draft = state.draft;
  const canSave = !!(draft.stationName.trim() && draft.postCode.trim() && state.loggedInAuditor);
  return `<div class="screen">
    <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 16px;border-bottom:1px solid rgba(20,20,15,0.1);background:#fff;flex-shrink:0;">
      <button onclick="App.backToDashboard()" style="background:none;border:none;padding:6px;cursor:pointer;display:flex;"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#14140F" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg></button>
      <div style="font-size:16px;font-weight:700;color:#14140F;">${state.editingId ? 'Edit Audit' : 'New Audit'}</div>
      ${canSave ? `<button onclick="App.saveDraft()" style="background:#1E7E34;color:#fff;border:none;border-radius:8px;padding:8px 16px;font-size:13px;font-weight:700;cursor:pointer;">Save</button>` : `<button class="btn-disabled">Save</button>`}
    </div>
    <div class="scroll" style="padding:18px 16px 40px;display:flex;flex-direction:column;gap:18px;">
      ${state.saveError ? `<div style="background:#F1DAD7;color:#B3261E;border-radius:10px;padding:10px 13px;font-size:12.5px;font-weight:600;line-height:1.4;">${esc(state.saveError)}</div>` : ''}
      <div style="display:flex;flex-direction:column;gap:6px;">
        <label class="label">Auditor</label>
        <div style="box-sizing:border-box;width:100%;background:#ECE9DC;border-radius:10px;padding:11px 13px;font-size:14px;color:#14140F;font-weight:600;">${esc(state.loggedInAuditor)}</div>
      </div>
      <div style="display:flex;flex-direction:column;gap:6px;">
        <label class="label">Station Name</label>
        <input class="text-input" data-focus-key="stationName" value="${esc(draft.stationName)}" oninput="App.handleStationName(this.value)" placeholder="e.g. Shell Cricklewood"/>
      </div>
      <div style="display:flex;flex-direction:column;gap:6px;">
        <label class="label">Brand</label>
        <div style="display:flex;flex-wrap:wrap;gap:8px;">
          ${BRANDS.map(name => {
            const active = draft.brandName === name;
            return `<div onclick="App.selectBrand('${name.replace(/'/g,"\\'")}')" style="padding:8px 14px;border-radius:20px;font-size:12.5px;cursor:pointer;${active ? 'background:#1E7E34;color:#fff;font-weight:600;' : 'background:#fff;border:1px solid rgba(20,20,15,0.15);color:#14140F;font-weight:500;'}">${esc(name)}</div>`;
          }).join('')}
        </div>
      </div>
      <div style="display:flex;flex-direction:column;gap:6px;">
        <label class="label">Postcode</label>
        <input class="text-input" style="text-transform:uppercase;" data-focus-key="postCode" value="${esc(draft.postCode)}" oninput="App.handlePostCode(this.value)" placeholder="e.g. NW2 6JB"/>
      </div>
      <div style="display:flex;flex-direction:column;gap:6px;">
        <label class="label">Facilities</label>
        <div style="display:flex;flex-direction:column;gap:8px;">
          ${FACILITY_DEFS.map(facilityRowHtml).join('')}
        </div>
      </div>
      <div style="display:flex;flex-direction:column;gap:6px;">
        <label class="label">Loyalty Programs</label>
        ${checklistHtml(LOYALTY_PROGRAMS, draft.loyaltyPrograms || [], 'toggleLoyaltyProgram', LOYALTY_COLOR_MAP)}
      </div>
      <div style="display:flex;flex-direction:column;gap:6px;">
        <label class="label">Parcel Drop-off</label>
        ${checklistHtml(DROPOFF_SERVICES, draft.parcelDropoff || [], 'toggleDropoffService', DROPOFF_COLOR_MAP)}
      </div>
      <div style="display:flex;flex-direction:column;gap:6px;">
        <label class="label">Delivery Partners</label>
        ${deliveryPartnersFormHtml(draft)}
      </div>
      <div style="display:flex;flex-direction:column;gap:6px;">
        <label class="label">Notes</label>
        <textarea class="text-input" rows="4" style="font-family:inherit;resize:none;font-size:13.5px;" data-focus-key="notes" oninput="App.handleNotes(this.value)" placeholder="Auditor remarks...">${esc(draft.notes)}</textarea>
      </div>
    </div>
  </div>`;
}

function renderDetail() {
  const a = state.audits.find(x => x.id === state.selectedId);
  if (!a) return `<div class="screen"><div class="scroll" style="padding:40px;text-align:center;color:rgba(20,20,15,0.4);">Audit not found.</div></div>`;
  const buildRow = def => {
    const status = a[def.key];
    const isToilets = def.key === 'statusToilets', isCoffee = def.key === 'statusCoffee';
    let sub = '';
    if (isToilets && status === 'available') {
      const labels = TOILET_DEFS.filter(t => a[t.key]).map(t => t.label);
      sub = `<div style="font-size:12px;color:rgba(20,20,15,0.55);margin-top:8px;padding-top:8px;border-top:1px solid rgba(20,20,15,0.08);">${labels.length ? esc(labels.join(', ')) : 'No breakdown recorded'}</div>`;
    }
    if (isCoffee && status === 'available') {
      const list = (a.coffeeBrands||[]).map(b => b === 'Other' ? (a.coffeeOther || 'Other') : b);
      sub = `<div style="font-size:12px;color:rgba(20,20,15,0.55);margin-top:8px;padding-top:8px;border-top:1px solid rgba(20,20,15,0.08);">${list.length ? esc(list.join(', ')) : 'No brand recorded'}</div>`;
    }
    const isMultiLocker = def.key === 'statusParcelLocker';
    const isFuelCard = def.key === 'statusFuelCard';
    const isWaitingTime = def.key === 'statusWaitingTime';
    const lockerSelected = a.parcelLockerBrands || [];
    const fuelCardSelected = a.fuelCardAvailability || [];
    return `<div style="background:#fff;border-radius:12px;padding:10px 12px;border:1px solid rgba(20,20,15,0.08);">
      <div style="display:flex;align-items:center;justify-content:space-between;">
        <div style="display:flex;align-items:center;gap:10px;">
          ${facilityIconWrap(def.icon, isMultiLocker ? (lockerSelected.length ? (lockerSelected.includes('None') ? '#B3261E' : '#1E7E34') : 'rgba(20,20,15,0.45)') : (isFuelCard ? (fuelCardSelected.length ? (fuelCardSelected.includes('None') ? '#B3261E' : '#1E7E34') : 'rgba(20,20,15,0.45)') : iconColorFor(status)))}
          <span style="font-size:13.5px;color:#14140F;">${def.label}</span>
        </div>
        <span style="font-size:12px;font-weight:700;">${isMultiLocker ? (lockerSelected.length ? esc(lockerSelected.join(', ')) : 'Unknown') : ((def.key === 'statusFuelCard') ? (fuelCardSelected.length ? esc(fuelCardSelected.join(', ')) : 'Unknown') : ((def.key === 'statusConvenienceStore' || def.key === 'statusWaitingTime') ? (status ? esc(status) : 'Unknown') : (STATUS_LABELS[status] || 'Unknown')))}</span>
      </div>
      ${sub}
    </div>`;
  };
  const rows = FACILITY_DEFS.map(buildRow).join('');

  return `<div class="screen" style="position:relative;">
    <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 16px;border-bottom:1px solid rgba(20,20,15,0.1);background:#fff;flex-shrink:0;">
      <button onclick="App.backToDashboard()" style="background:none;border:none;padding:6px;cursor:pointer;display:flex;"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#14140F" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg></button>
      <div style="font-size:16px;font-weight:700;color:#14140F;">Audit Detail</div>
      <div style="display:flex;gap:4px;">
        ${a.auditorName === state.loggedInAuditor ? `
        <button onclick="App.editSelected()" style="background:none;border:none;padding:6px;cursor:pointer;display:flex;"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#14140F" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg></button>
        <button onclick="App.confirmDeleteToggle()" style="background:none;border:none;padding:6px;cursor:pointer;display:flex;"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#B3261E" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0l-1 14a2 2 0 01-2 2H7a2 2 0 01-2-2L4 6h16z"/></svg></button>` : `<div style="width:34px;"></div>`}
      </div>
    </div>
    <div class="scroll" style="padding:16px;display:flex;flex-direction:column;gap:12px;">
      <div style="background:#fff;border-radius:14px;padding:16px;display:flex;flex-direction:column;gap:4px;border:1px solid rgba(20,20,15,0.08);">
        <div style="font-size:18px;font-weight:700;color:#14140F;">${esc(a.stationName)}</div>
        <div style="font-size:13px;color:rgba(20,20,15,0.55);">${esc(a.brandName)} · ${esc(a.postCode)}</div>
        <div style="font-size:12px;color:rgba(20,20,15,0.4);margin-top:4px;">Audited ${esc(a.auditDate)}</div>
        <div style="font-size:12.5px;color:#1E7E34;font-weight:600;margin-top:4px;">Audited by: ${esc(a.auditorName)}</div>
      </div>
      ${a.auditorName !== state.loggedInAuditor ? `<div style="background:#ECE9DC;border-radius:10px;padding:10px 13px;font-size:12.5px;color:rgba(20,20,15,0.6);">Only ${esc(a.auditorName)} can modify this audit.</div>` : ''}
      <div class="label" style="margin-top:4px;">Facilities</div>
      <div style="display:flex;flex-direction:column;gap:8px;">${rows}</div>
      ${(a.loyaltyPrograms && a.loyaltyPrograms.length) ? `<div style="background:#fff;border-radius:12px;padding:12px 14px;border:1px solid rgba(20,20,15,0.08);">
        <div class="label" style="margin-bottom:8px;">Loyalty Programs</div>
        ${badgeHtml(a.loyaltyPrograms.map(name => { const s = chipSpecFor(LOYALTY_COLOR_MAP, name); return { label: name, grad: chipGradient(s.bg), text: s.text }; }))}
      </div>` : ''}
      ${(a.parcelDropoff && a.parcelDropoff.length) ? `<div style="background:#fff;border-radius:12px;padding:12px 14px;border:1px solid rgba(20,20,15,0.08);">
        <div class="label" style="margin-bottom:8px;">Parcel Drop-off</div>
        ${badgeHtml(a.parcelDropoff.map(name => { const s = chipSpecFor(DROPOFF_COLOR_MAP, name); return { label: name, grad: chipGradient(s.bg), text: s.text }; }))}
      </div>` : ''}
      ${(a.deliveryPartners && a.deliveryPartners.length) ? `<div style="background:#fff;border-radius:12px;padding:12px 14px;border:1px solid rgba(20,20,15,0.08);">
        <div class="label" style="margin-bottom:8px;">Delivery Partners</div>
        ${badgeHtml(a.deliveryPartners.map(name => {
          const s = chipSpecFor(DELIVERY_COLOR_MAP, name);
          const hrs = (a.deliveryPartnersHours || {})[name];
          const hoursLabel = hrs ? (hrs.type === '24/7' ? '24/7' : (hrs.start && hrs.end ? `${hrs.start}\u2013${hrs.end}` : 'Hours not set')) : '';
          return { label: hoursLabel ? `${name}: ${hoursLabel}` : name, grad: chipGradient(s.bg), text: s.text };
        }))}
      </div>` : ''}
      ${a.notes ? `<div style="background:#fff;border-radius:12px;padding:12px 14px;border:1px solid rgba(20,20,15,0.08);">
        <div class="label" style="margin-bottom:6px;">Auditor Notes</div>
        <div style="font-size:13.5px;color:#14140F;line-height:1.5;">${esc(a.notes)}</div>
      </div>` : ''}
    </div>
    ${state.deleteConfirm ? `<div style="position:absolute;inset:0;background:rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;padding:24px;">
      <div style="background:#fff;border-radius:16px;padding:20px;display:flex;flex-direction:column;gap:14px;max-width:280px;">
        <div style="font-size:15px;font-weight:700;color:#14140F;">Delete this audit?</div>
        <div style="font-size:13px;color:rgba(20,20,15,0.55);">This can't be undone.</div>
        <div style="display:flex;gap:8px;justify-content:flex-end;">
          <button onclick="App.confirmDeleteToggle()" style="background:rgba(20,20,15,0.08);color:#14140F;border:none;border-radius:8px;padding:9px 14px;font-size:13px;font-weight:600;cursor:pointer;">Cancel</button>
          <button onclick="App.deleteSelected()" style="background:#B3261E;color:#fff;border:none;border-radius:8px;padding:9px 14px;font-size:13px;font-weight:600;cursor:pointer;">Delete</button>
        </div>
      </div>
    </div>` : ''}
  </div>`;
}

function stationCardHtml(s, showDist) {
  const colors = { badgeBg: s.badgeBg, badgeBorder: s.badgeBorder, badgeText: s.badgeText, badgeInitial: s.badgeInitial };
  return `<div onclick="App.viewStationDetail(${s.idx}${showDist ? `,'${s.distStr}'` : ''})" style="background:#fff;border-radius:14px;padding:13px 15px;display:flex;flex-direction:column;gap:8px;border:1px solid rgba(20,20,15,0.08);cursor:pointer;">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;">
      <div style="min-width:0;">
        <div style="font-size:14.5px;font-weight:700;color:#14140F;">${esc(s.nameDisplay)}</div>
        <div style="display:flex;align-items:center;gap:6px;margin-top:2px;">
          ${brandBadge(colors)}
          <span style="font-size:12px;color:rgba(20,20,15,0.55);">${esc(s.b)} · ${esc(s.a)}, ${esc(s.c)} · ${esc(s.pc)}</span>
        </div>
      </div>
      ${showDist ? `<div style="font-size:11.5px;font-weight:700;color:#1E7E34;white-space:nowrap;flex-shrink:0;">${s.distStr} mi</div>` : ''}
    </div>
    <div style="display:flex;flex-wrap:wrap;gap:6px;">
      ${s.priceRows.map(p => `<div style="background:#ECE9DC;border-radius:8px;padding:5px 9px;"><span style="font-size:10px;color:rgba(20,20,15,0.5);font-weight:600;">${p.label} </span><span style="font-size:11.5px;color:#14140F;font-weight:800;">${p.value}</span></div>`).join('')}
    </div>
    <div style="display:flex;justify-content:flex-end;">
      <button onclick="App.startAuditFromNearby(${s.idx}, event)" style="background:#FCE36B;color:#14140F;border:none;border-radius:8px;padding:7px 13px;font-size:12px;font-weight:700;cursor:pointer;">Start Audit</button>
    </div>
  </div>`;
}

function renderNearby() {
  const searching = state.stationQuery.trim().length > 0;
  let body;
  if (searching) {
    body = state.searchResults.length === 0
      ? `<div style="text-align:center;padding:40px 20px;color:rgba(20,20,15,0.4);font-size:13px;line-height:1.5;">No stations found — check the postcode or name and try again.</div>`
      : state.searchResults.map(s => stationCardHtml(s, false)).join('');
  } else {
    const locBtn = `<button onclick="App.findMyLocation()" style="display:flex;align-items:center;justify-content:center;gap:8px;background:#1E7E34;color:#fff;border:none;border-radius:12px;padding:13px;font-size:13.5px;font-weight:700;cursor:pointer;">
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg>
      <span>${state.locStatus === 'locating' ? 'Locating…' : 'Use My Location'}</span>
    </button>`;
    const err = state.locStatus === 'error' ? `<div style="font-size:12px;color:#B3261E;text-align:center;line-height:1.5;">Location unavailable in this preview — will work once installed on your phone.</div>` : '';
    const results = state.locStatus === 'ready' && state.nearbyResults.length
      ? `<div style="font-size:11.5px;color:rgba(20,20,15,0.5);margin-top:2px;">Nearest to your location</div>${state.nearbyResults.map(s => stationCardHtml(s, true)).join('')}`
      : '';
    const prompt = state.locStatus !== 'ready' ? `<div style="text-align:center;padding:40px 20px;color:rgba(20,20,15,0.4);font-size:13px;line-height:1.5;">Search by postcode or station name to find nearby stations.</div>` : '';
    body = locBtn + err + results + prompt;
  }
  return `<div class="screen">
    <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 16px;border-bottom:1px solid rgba(20,20,15,0.1);background:#fff;flex-shrink:0;">
      <button onclick="App.backToDashboard()" style="background:none;border:none;padding:6px;cursor:pointer;display:flex;"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#14140F" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg></button>
      <div style="font-size:16px;font-weight:700;color:#14140F;">Nearby Stations</div>
      <div style="width:34px;"></div>
    </div>
    <div class="scroll" style="padding:16px;display:flex;flex-direction:column;gap:12px;">
      <input class="text-input" data-focus-key="stationQuery" value="${esc(state.stationQuery)}" oninput="App.handleStationQuery(this.value)" placeholder="Search by postcode or station name"/>
      ${body}
    </div>
  </div>`;
}

function renderStationDetail() {
  const s = (window.FUEL_STATIONS || [])[state.selectedStationIdx];
  if (!s) return `<div class="screen"><div class="scroll" style="padding:40px;text-align:center;">Station not found.</div></div>`;
  const colors = brandColorFor(s.b);
  const favorited = state.favorites.includes(state.selectedStationIdx);
  const priceRows = priceRowsFor(s);
  return `<div class="screen" style="background:#F7F5EC;">
    <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 16px;flex-shrink:0;gap:8px;">
      <button onclick="App.backToNearby()" style="background:#fff;border:none;border-radius:22px;padding:9px 16px 9px 10px;cursor:pointer;display:flex;align-items:center;gap:4px;box-shadow:0 1px 3px rgba(0,0,0,0.06);">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#14140F" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
        <span style="font-size:14px;font-weight:700;color:#14140F;">Back</span>
      </button>
      <div style="flex:1;font-size:15px;font-weight:800;color:#14140F;text-transform:uppercase;text-align:center;letter-spacing:0.2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(toTitleCase(s.n))}</div>
      <button onclick="App.toggleFavorite(${state.selectedStationIdx}, event)" style="width:38px;height:38px;border-radius:50%;background:#fff;border:none;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 1px 3px rgba(0,0,0,0.06);flex-shrink:0;">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="${favorited?'#1E7E34':'none'}" stroke="${favorited?'#1E7E34':'rgba(20,20,15,0.5)'}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.8 4.6a5.5 5.5 0 00-7.8 0L12 5.6l-1-1a5.5 5.5 0 00-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 000-7.8z"/></svg>
      </button>
    </div>
    <div class="scroll" style="padding:0 16px 16px;">
      <div style="background:#fff;border-radius:18px;padding:18px;display:flex;flex-direction:column;gap:14px;">
        <div style="display:flex;align-items:center;gap:10px;">
          <div style="display:flex;align-items:center;gap:8px;background:${colors.badgeBg};color:${colors.badgeText};font-size:12px;font-weight:800;padding:6px 12px;border-radius:8px;border:2px solid ${colors.badgeBorder};">
            <div style="width:16px;height:16px;border-radius:50%;background:rgba(255,255,255,0.35);display:flex;align-items:center;justify-content:center;flex-shrink:0;"><span style="font-size:9px;font-weight:800;">${colors.badgeInitial}</span></div>
            <span>${esc(s.b)}</span>
          </div>
          ${state.selectedStationDist ? `<span style="font-size:13px;color:rgba(20,20,15,0.45);">${state.selectedStationDist} mi away</span>` : ''}
        </div>
        <div style="display:flex;align-items:flex-start;gap:10px;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(20,20,15,0.4)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;margin-top:1px;"><path d="M12 21s-7-6.2-7-11a7 7 0 0114 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.4"/></svg>
          <span style="font-size:14.5px;color:rgba(20,20,15,0.6);line-height:1.4;">${esc([s.a,s.c,s.county,s.pc].filter(Boolean).join(', '))}</span>
        </div>
        <div style="display:flex;align-items:center;gap:10px;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(20,20,15,0.4)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>
          <span style="font-size:14.5px;color:rgba(20,20,15,0.6);">${esc(s.hrs || 'Hours not listed')}</span>
        </div>
        <div style="display:flex;align-items:center;gap:10px;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(20,20,15,0.4)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;"><path d="M22 16.9v3a2 2 0 01-2.2 2 19.8 19.8 0 01-8.6-3 19.5 19.5 0 01-6-6 19.8 19.8 0 01-3-8.7A2 2 0 014.1 2h3a2 2 0 012 1.7c.1 1 .3 2 .7 2.9a2 2 0 01-.4 2.1L8.1 10a16 16 0 006 6l1.3-1.3a2 2 0 012.1-.4c.9.4 1.9.6 2.9.7a2 2 0 011.7 2z"/></svg>
          <span style="font-size:14.5px;color:${s.tel?'#1E7E34':'rgba(20,20,15,0.4)'};font-weight:${s.tel?600:400};">${esc(s.tel || 'Not available in dataset')}</span>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:10px;">
          ${priceRows.length ? priceRows.map(p => `<div style="background:#ECE9DC;border-radius:12px;padding:12px 16px;min-width:100px;"><div style="font-size:12px;color:rgba(20,20,15,0.5);font-weight:600;">${p.label}</div><div style="font-size:19px;color:#14140F;font-weight:800;margin-top:2px;">${p.value}</div></div>`).join('') : `<div style="font-size:13px;color:rgba(20,20,15,0.4);">No prices reported for this station.</div>`}
        </div>
      </div>
      <button onclick="App.startAuditFromNearby(${state.selectedStationIdx}, event)" style="width:100%;margin-top:14px;background:#1E7E34;color:#fff;border:none;border-radius:12px;padding:14px;font-size:13.5px;font-weight:700;cursor:pointer;">Start Audit for This Station</button>
    </div>
  </div>`;
}

/* ---------- render (focus-preserving + scroll-preserving: prevents keyboard closing and screen jumping on toggle taps) ---------- */
function render() {
  const root = document.getElementById('app');
  const active = document.activeElement;
  let focusKey = null, selStart = null, selEnd = null;
  const scrollEl = root.querySelector('.scroll');
  const priorScrollTop = scrollEl ? scrollEl.scrollTop : null;
  if (active && active.dataset && active.dataset.focusKey) {
    focusKey = active.dataset.focusKey;
    if (typeof active.selectionStart === 'number') { selStart = active.selectionStart; selEnd = active.selectionEnd; }
  }

  if (!state.loggedInAuditor) {
    root.innerHTML = renderLogin();
  } else {
    switch (state.screen) {
      case 'form': root.innerHTML = renderForm(); break;
      case 'detail': root.innerHTML = renderDetail(); break;
      case 'nearby': root.innerHTML = renderNearby(); break;
      case 'stationDetail': root.innerHTML = renderStationDetail(); break;
      default: root.innerHTML = renderDashboard();
    }
  }

  const newScrollEl = root.querySelector('.scroll');
  if (newScrollEl && priorScrollTop != null) newScrollEl.scrollTop = priorScrollTop;

  if (focusKey) {
    const el = root.querySelector(`[data-focus-key="${focusKey}"]`);
    if (el) {
      el.focus();
      if (typeof selStart === 'number' && el.setSelectionRange) {
        try { el.setSelectionRange(selStart, selEnd); } catch (e) {}
      }
    }
  }
}

/* Keep the focused field visible above the on-screen keyboard on mobile */
document.addEventListener('focusin', (e) => {
  const t = e.target;
  if (t && (t.tagName === 'TEXTAREA' || t.tagName === 'INPUT')) {
    setTimeout(() => { if (t.scrollIntoView) t.scrollIntoView({ block: 'center', behavior: 'smooth' }); }, 300);
  }
});

function initSupabase() {
  const wire = () => {
    const sb = window.__supabase;
    if (!sb) { setState({ cloudStatus: 'error' }); return; }
    try {
      sb.subscribe((audits) => setState({ audits, cloudStatus: 'connected' }));
    } catch (err) {
      console.warn('Supabase init failed, falling back to local session data:', err);
      setState({ cloudStatus: 'error' });
    }
  };
  if (window.__supabase) wire();
  else window.addEventListener('supabase-ready', wire, { once: true });
  setTimeout(() => { if (state.cloudStatus === 'connecting') setState({ cloudStatus: 'error' }); }, 4000);
}
initSupabase();

render();
