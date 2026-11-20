import mongoose from 'mongoose';

const BedSchema = new mongoose.Schema({
  total: { type: Number, default: 0 },
  available: { type: Number, default: 0 },
  occupied: { type: Number, default: 0 },
  icuTotal: { type: Number, default: 0 },
  icuAvailable: { type: Number, default: 0 },
  updatedAt: { type: Date, default: Date.now }
}, { _id: false });

const BloodStockSchema = new mongoose.Schema({
  units: { type: Object, default: {} },
  updatedAt: { type: Date, default: Date.now }
}, { _id: false });

const EquipmentSchema = new mongoose.Schema({
  ventilators: { total: Number, available: Number, status: String },
  oxygenSupply: { total: Number, available: Number, status: String },
  ecg: { total: Number, available: Number, status: String },
  xray: { total: Number, available: Number, status: String },
  ultrasound: { total: Number, available: Number, status: String },
  ctScan: { total: Number, available: Number, status: String },
  mri: { total: Number, available: Number, status: String },
  dialysis: { total: Number, available: Number, status: String },
  updatedAt: { type: Date, default: Date.now }
}, { _id: false });

const SpecialistSchema = new mongoose.Schema({
  cardiologist: { name: String, onDuty: Boolean, shift: String },
  neurologist: { name: String, onDuty: Boolean, shift: String },
  orthopedic: { name: String, onDuty: Boolean, shift: String },
  generalSurgeon: { name: String, onDuty: Boolean, shift: String },
  neurosurgeon: { name: String, onDuty: Boolean, shift: String },
  gynecologist: { name: String, onDuty: Boolean, shift: String },
  pediatrician: { name: String, onDuty: Boolean, shift: String },
  anesthesiologist: { name: String, onDuty: Boolean, shift: String },
  updatedAt: { type: Date, default: Date.now }
}, { _id: false });

const ServicesSchema = new mongoose.Schema({
  emergency: { type: String, default: "Available" },
  icu: { type: String, default: "Available" },
  operationTheatre: { type: String, default: "Available" },
  laboratory: { type: String, default: "Available" },
  bloodBank: { type: String, default: "Available" },
  radiology: { type: String, default: "Available" },
  dialysis: { type: String, default: "Available" },
  updatedAt: { type: Date, default: Date.now }
}, { _id: false });

const HospitalSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  type: { type: String, default: "Tertiary" }, // Tertiary, DHQ, THQ
  district: { type: String, required: true },
  address: { type: String, default: "" },
  phone: { type: String, default: "" },
  emergencyPhone: { type: String, default: "" },
  adminName: { type: String, default: "" },
  adminEmail: { type: String, default: "" },
  resources: {
    beds: BedSchema,
    bloodStock: BloodStockSchema,
    equipment: EquipmentSchema,
    specialists: SpecialistSchema,
    services: ServicesSchema,
    lastOverallUpdate: { type: Date, default: Date.now }
  }
}, { timestamps: true });

const ReferralSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  patientId: { type: String, required: true },
  patientName: { type: String, required: true },
  age: { type: Number, required: true },
  gender: { type: String, required: true },
  referringBHU: { type: String, required: true },
  bhuDoctorName: { type: String, required: true },
  targetHospitalId: { type: String, required: true },
  symptoms: { type: String, required: true },
  medicalHistory: { type: String, default: "" },
  currentCondition: { type: String, default: "" },
  requiredServices: { type: [String], default: [] },
  doctorNotes: { type: String, default: "" },
  status: { type: String, enum: ["PENDING", "ACCEPTED", "DECLINED"], default: "PENDING" },
  declineReason: { type: String, default: null },
  reconfirmedResources: { type: [String], default: [] },
  createdAt: { type: Date, default: Date.now },
  respondedAt: { type: Date, default: null }
}, { timestamps: true });

const EmergencyAlertSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  rescueCaseId: { type: String, required: true },
  patientName: { type: String, default: "Unidentified Patient" },
  emergencyType: { type: String, required: true },
  targetHospitalId: { type: String, required: true },
  location: { type: String, default: "" },
  requiredFacilities: { type: [String], default: [] },
  etaMinutes: { type: Number, default: 10 },
  ambulanceId: { type: String, default: "" },
  paramedicName: { type: String, default: "" },
  vitals: { type: String, default: "" },
  status: { type: String, enum: ["ALERT_RECEIVED", "ACKNOWLEDGED", "FACILITIES_CONFIRMED"], default: "ALERT_RECEIVED" },
  confirmedFacilities: { type: [String], default: [] },
  createdAt: { type: Date, default: Date.now },
  acknowledgedAt: { type: Date, default: null }
}, { timestamps: true });

const UserSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  username: { type: String, required: true },
  name: { type: String, default: "" },
  role: { type: String, default: "HOSPITAL_STAFF" },
  hospitalId: { type: String, required: true },
  password: { type: String, required: true }
}, { timestamps: true });

export const Hospital = mongoose.models.Hospital || mongoose.model('Hospital', HospitalSchema);
export const Referral = mongoose.models.Referral || mongoose.model('Referral', ReferralSchema);
export const EmergencyAlert = mongoose.models.EmergencyAlert || mongoose.model('EmergencyAlert', EmergencyAlertSchema);
export const User = mongoose.models.User || mongoose.model('User', UserSchema);

