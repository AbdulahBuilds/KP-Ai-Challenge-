import { initialHospitals } from './seedData.js';
import { hospitalsManifest } from './integration.js';

const hospitals = initialHospitals;

export { hospitals, hospitalsManifest };
export function getHospitals() {
  return hospitals;
}
export default hospitals;
