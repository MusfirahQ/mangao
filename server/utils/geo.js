// Approximate map positions (latitude, longitude) for Lahore areas.
// Used to place stores and the customer's delivery area on the map.
export const AREA_COORDS = {
  'Johar Town': [31.4697, 74.2728],
  'DHA': [31.4730, 74.4040],
  'Gulberg': [31.5204, 74.3487],
  'Model Town': [31.4835, 74.3255],
  'Bahria Town': [31.3680, 74.1850],
  'Wapda Town': [31.4300, 74.2650],
  'Township': [31.4480, 74.3080],
  'Garden Town': [31.5040, 74.3250],
  'Cantt': [31.5100, 74.3800],
  'Iqbal Town': [31.5090, 74.2860],
  // store locations used by the starting catalog
  'Gulberg III': [31.5130, 74.3460],
  'Gulberg II': [31.5260, 74.3520],
  'MM Alam Road': [31.5160, 74.3510],
  'Liberty': [31.5110, 74.3440],
  'Lakshmi Chowk': [31.5650, 74.3240],
  'DHA Phase 3': [31.4790, 74.3800],
  'DHA Phase 5': [31.4640, 74.4080],
  'DHA Phase 6': [31.4690, 74.4490],
  'Packages Mall': [31.4710, 74.3560],
  'Thokar Niaz Baig': [31.4720, 74.2400],
};
export const LAHORE = [31.5204, 74.3587];

export function coordsFor(area) {
  return AREA_COORDS[area] || LAHORE;
}

// Accept any real-world coordinate (riders could be anywhere while testing).
export function validLatLng(lat, lng) {
  return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
}
