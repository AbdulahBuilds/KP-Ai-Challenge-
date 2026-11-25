import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { initialHospitals, initialReferrals, initialEmergencyAlerts, initialStaffUsers } from './seedData.js';
import { Hospital, Referral, EmergencyAlert, User } from './models.js';

// Mongoose connection caching for Vercel Serverless
let cachedMongoose = global.mongoose;
if (!cachedMongoose) {
  cachedMongoose = global.mongoose = { conn: null, promise: null };
}

async function connectToMongo() {
  const uri = process.env.MONGODB_URI;
  if (!uri) return null;

  if (cachedMongoose.conn) {
    return cachedMongoose.conn;
  }

  if (!cachedMongoose.promise) {
    const opts = {
      bufferCommands: false,
    };
    cachedMongoose.promise = mongoose.connect(uri, opts).then((mongooseInstance) => {
      return mongooseInstance;
    });
  }

  try {
    cachedMongoose.conn = await cachedMongoose.promise;
    return cachedMongoose.conn;
  } catch (e) {
    cachedMongoose.promise = null;
    console.error("MongoDB Atlas connection error, falling back to local store:", e.message);
    return null;
  }
}

// Local File Store Fallback (when MONGODB_URI is not set)
const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'db.json');

function ensureLocalFileStore() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(DATA_FILE)) {
      const initialStore = {
        hospitals: JSON.parse(JSON.stringify(initialHospitals)),
        referrals: JSON.parse(JSON.stringify(initialReferrals)),
        emergencyAlerts: JSON.parse(JSON.stringify(initialEmergencyAlerts)),
        users: JSON.parse(JSON.stringify(initialStaffUsers)),
        lastReset: new Date().toISOString()
      };
      fs.writeFileSync(DATA_FILE, JSON.stringify(initialStore, null, 2), 'utf8');
      return initialStore;
    }
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error("Local file store error:", err);
    return {
      hospitals: JSON.parse(JSON.stringify(initialHospitals)),
      referrals: JSON.parse(JSON.stringify(initialReferrals)),
      emergencyAlerts: JSON.parse(JSON.stringify(initialEmergencyAlerts)),
      users: JSON.parse(JSON.stringify(initialStaffUsers))
    };
  }
}

function saveLocalStore(data) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error("Failed to save local store:", err);
  }
}

export const dataStore = {
  // Check if connected to MongoDB Atlas
  async isMongoConnected() {
    return Boolean(process.env.MONGODB_URI && cachedMongoose.conn);
  },

  // Seed DB if empty
  async seedIfEmpty() {
    const mongo = await connectToMongo();
    if (mongo) {
      const count = await Hospital.countDocuments();
      if (count === 0) {
        await Hospital.insertMany(initialHospitals);
        await Referral.insertMany(initialReferrals);
        await EmergencyAlert.insertMany(initialEmergencyAlerts);
        await User.insertMany(initialStaffUsers);
        console.log("MongoDB Atlas initialized with initial KPK dataset.");
      }
    } else {
      ensureLocalFileStore();
    }
  },

  // Reset database back to default seed data
  async resetDatabase() {
    const mongo = await connectToMongo();
    if (mongo) {
      await Hospital.deleteMany({});
      await Referral.deleteMany({});
      await EmergencyAlert.deleteMany({});
      await User.deleteMany({});
      await Hospital.insertMany(initialHospitals);
      await Referral.insertMany(initialReferrals);
      await EmergencyAlert.insertMany(initialEmergencyAlerts);
      await User.insertMany(initialStaffUsers);
      return { success: true, mode: 'mongo' };
    } else {
      const resetData = {
        hospitals: JSON.parse(JSON.stringify(initialHospitals)),
        referrals: JSON.parse(JSON.stringify(initialReferrals)),
        emergencyAlerts: JSON.parse(JSON.stringify(initialEmergencyAlerts)),
        users: JSON.parse(JSON.stringify(initialStaffUsers)),
        lastReset: new Date().toISOString()
      };
      saveLocalStore(resetData);
      return { success: true, mode: 'local' };
    }
  },

  // HOSPITALS
  async getHospitals() {
    const mongo = await connectToMongo();
    if (mongo) {
      await this.seedIfEmpty();
      return await Hospital.find({}).lean();
    }
    const store = ensureLocalFileStore();
    return store.hospitals;
  },

  async getHospitalById(id) {
    const mongo = await connectToMongo();
    if (mongo) {
      return await Hospital.findOne({ id }).lean();
    }
    const store = ensureLocalFileStore();
    return store.hospitals.find(h => h.id === id) || null;
  },

  async updateHospitalResources(id, resourceUpdates) {
    const nowIso = new Date().toISOString();
    const mongo = await connectToMongo();
    if (mongo) {
      const updateDoc = {};
      if (resourceUpdates.beds) {
        updateDoc['resources.beds'] = { ...resourceUpdates.beds, updatedAt: new Date() };
      }
      if (resourceUpdates.bloodStock) {
        updateDoc['resources.bloodStock'] = { ...resourceUpdates.bloodStock, updatedAt: new Date() };
      }
      if (resourceUpdates.equipment) {
        updateDoc['resources.equipment'] = { ...resourceUpdates.equipment, updatedAt: new Date() };
      }
      if (resourceUpdates.specialists) {
        updateDoc['resources.specialists'] = { ...resourceUpdates.specialists, updatedAt: new Date() };
      }
      if (resourceUpdates.services) {
        updateDoc['resources.services'] = { ...resourceUpdates.services, updatedAt: new Date() };
      }
      updateDoc['resources.lastOverallUpdate'] = new Date();

      const updated = await Hospital.findOneAndUpdate({ id }, { $set: updateDoc }, { new: true }).lean();
      return updated;
    }

    const store = ensureLocalFileStore();
    const index = store.hospitals.findIndex(h => h.id === id);
    if (index === -1) return null;

    const current = store.hospitals[index];
    if (resourceUpdates.beds) {
      current.resources.beds = { ...current.resources.beds, ...resourceUpdates.beds, updatedAt: nowIso };
    }
    if (resourceUpdates.bloodStock) {
      current.resources.bloodStock = { ...current.resources.bloodStock, ...resourceUpdates.bloodStock, updatedAt: nowIso };
    }
    if (resourceUpdates.equipment) {
      current.resources.equipment = { ...current.resources.equipment, ...resourceUpdates.equipment, updatedAt: nowIso };
    }
    if (resourceUpdates.specialists) {
      current.resources.specialists = { ...current.resources.specialists, ...resourceUpdates.specialists, updatedAt: nowIso };
    }
    if (resourceUpdates.services) {
      current.resources.services = { ...current.resources.services, ...resourceUpdates.services, updatedAt: nowIso };
    }
    current.resources.lastOverallUpdate = nowIso;

    store.hospitals[index] = current;
    saveLocalStore(store);
    return current;
  },

  async updateHospitalProfile(id, profileData) {
    const mongo = await connectToMongo();
    if (mongo) {
      const updated = await Hospital.findOneAndUpdate(
        { id },
        { $set: profileData },
        { new: true }
      ).lean();
      return updated;
    }
    const store = ensureLocalFileStore();
    const index = store.hospitals.findIndex(h => h.id === id);
    if (index === -1) return null;

    store.hospitals[index] = { ...store.hospitals[index], ...profileData };
    saveLocalStore(store);
    return store.hospitals[index];
  },

  // REFERRALS (BHU -> Hospital)
  async getReferrals(hospitalId, status) {
    const mongo = await connectToMongo();
    if (mongo) {
      await this.seedIfEmpty();
      const query = {};
      if (hospitalId) query.targetHospitalId = hospitalId;
      if (status) query.status = status;
      return await Referral.find(query).sort({ createdAt: -1 }).lean();
    }
    const store = ensureLocalFileStore();
    let list = store.referrals;
    if (hospitalId) list = list.filter(r => r.targetHospitalId === hospitalId);
    if (status) list = list.filter(r => r.status === status);
    return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  },

  async getReferralById(id) {
    const mongo = await connectToMongo();
    if (mongo) {
      return await Referral.findOne({ id }).lean();
    }
    const store = ensureLocalFileStore();
    return store.referrals.find(r => r.id === id) || null;
  },

  async createReferral(data) {
    const newId = `REF-2026-${Math.floor(100 + Math.random() * 900)}`;
    const newRef = {
      id: newId,
      patientId: data.patientId || `PAT-KP-${Math.floor(1000 + Math.random() * 9000)}`,
      patientName: data.patientName,
      age: Number(data.age),
      gender: data.gender || "Unspecified",
      referringBHU: data.referringBHU,
      bhuDoctorName: data.bhuDoctorName || "BHU Medical Officer",
      targetHospitalId: data.targetHospitalId,
      symptoms: data.symptoms,
      medicalHistory: data.medicalHistory || "",
      currentCondition: data.currentCondition || "",
      requiredServices: Array.isArray(data.requiredServices) ? data.requiredServices : (data.requiredServices ? [data.requiredServices] : []),
      doctorNotes: data.doctorNotes || "",
      status: "PENDING",
      declineReason: null,
      reconfirmedResources: [],
      createdAt: new Date().toISOString(),
      respondedAt: null
    };

    const mongo = await connectToMongo();
    if (mongo) {
      const doc = await Referral.create(newRef);
      return doc.toObject();
    }

    const store = ensureLocalFileStore();
    store.referrals.unshift(newRef);
    saveLocalStore(store);
    return newRef;
  },

  async respondToReferral(id, { status, declineReason, reconfirmedResources }) {
    const nowIso = new Date().toISOString();
    const mongo = await connectToMongo();
    if (mongo) {
      const updated = await Referral.findOneAndUpdate(
        { id },
        {
          $set: {
            status,
            declineReason: declineReason || null,
            reconfirmedResources: reconfirmedResources || [],
            respondedAt: new Date()
          }
        },
        { new: true }
      ).lean();
      return updated;
    }

    const store = ensureLocalFileStore();
    const index = store.referrals.findIndex(r => r.id === id);
    if (index === -1) return null;

    store.referrals[index] = {
      ...store.referrals[index],
      status,
      declineReason: declineReason || null,
      reconfirmedResources: reconfirmedResources || [],
      respondedAt: nowIso
    };
    saveLocalStore(store);
    return store.referrals[index];
  },

  // EMERGENCY ALERTS (Rescue 1122 -> Hospital)
  async getEmergencyAlerts(hospitalId, status) {
    const mongo = await connectToMongo();
    if (mongo) {
      await this.seedIfEmpty();
      const query = {};
      if (hospitalId) query.targetHospitalId = hospitalId;
      if (status) query.status = status;
      return await EmergencyAlert.find(query).sort({ createdAt: -1 }).lean();
    }
    const store = ensureLocalFileStore();
    let list = store.emergencyAlerts;
    if (hospitalId) list = list.filter(a => a.targetHospitalId === hospitalId);
    if (status) list = list.filter(a => a.status === status);
    return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  },

  async getEmergencyAlertById(id) {
    const mongo = await connectToMongo();
    if (mongo) {
      return await EmergencyAlert.findOne({ $or: [{ id }, { rescueCaseId: id }] }).lean();
    }
    const store = ensureLocalFileStore();
    return store.emergencyAlerts.find((alert) => alert.id === id || alert.rescueCaseId === id) || null;
  },

  async createEmergencyAlert(data) {
    const idempotencyKey = data.idempotencyKey || null;
    if (idempotencyKey) {
      const mongoCheck = await connectToMongo();
      if (mongoCheck) {
        const existing = await EmergencyAlert.findOne({ idempotencyKey }).lean();
        if (existing) return existing;
      } else {
        const storeCheck = ensureLocalFileStore();
        const existing = storeCheck.emergencyAlerts.find((alert) => alert.idempotencyKey === idempotencyKey);
        if (existing) return existing;
      }
    }

    const newId = `1122-CASE-${Math.floor(100 + Math.random() * 900)}`;
    const newAlert = {
      id: newId,
      rescueCaseId: data.rescueCaseId || `RES-KPK-${Math.floor(100 + Math.random() * 900)}`,
      patientName: data.patientName || "Unidentified Patient",
      emergencyType: data.emergencyType,
      targetHospitalId: data.targetHospitalId,
      location: data.location || "Peshawar Metro Area",
      requiredFacilities: Array.isArray(data.requiredFacilities) ? data.requiredFacilities : (data.requiredFacilities ? [data.requiredFacilities] : []),
      etaMinutes: Number(data.etaMinutes) || 10,
      ambulanceId: data.ambulanceId || `AMB-1122-KP-${Math.floor(10 + Math.random() * 90)}`,
      paramedicName: data.paramedicName || "Rescue 1122 Lead Paramedic",
      vitals: data.vitals || "Critical / Polytrauma",
      status: "ALERT_RECEIVED",
      confirmedFacilities: [],
      idempotencyKey,
      etaUpdatedAt: null,
      createdAt: new Date().toISOString(),
      acknowledgedAt: null
    };

    const mongo = await connectToMongo();
    if (mongo) {
      try {
        const doc = await EmergencyAlert.create(newAlert);
        return doc.toObject();
      } catch (error) {
        if (idempotencyKey && error?.code === 11000) {
          const existing = await EmergencyAlert.findOne({ idempotencyKey }).lean();
          if (existing) return existing;
        }
        throw error;
      }
    }

    const store = ensureLocalFileStore();
    store.emergencyAlerts.unshift(newAlert);
    saveLocalStore(store);
    return newAlert;
  },

  async updateEmergencyAlertEta(id, etaMinutes) {
    const nowIso = new Date().toISOString();
    const mongo = await connectToMongo();
    if (mongo) {
      return await EmergencyAlert.findOneAndUpdate(
        { $or: [{ id }, { rescueCaseId: id }] },
        { $set: { etaMinutes: Number(etaMinutes), etaUpdatedAt: new Date() } },
        { new: true }
      ).lean();
    }
    const store = ensureLocalFileStore();
    const alert = store.emergencyAlerts.find((item) => item.id === id || item.rescueCaseId === id);
    if (!alert) return null;
    alert.etaMinutes = Number(etaMinutes);
    alert.etaUpdatedAt = nowIso;
    saveLocalStore(store);
    return alert;
  },

  async acknowledgeEmergencyAlert(id, { status = "ACKNOWLEDGED", confirmedFacilities = [] }) {
    const nowIso = new Date().toISOString();
    const mongo = await connectToMongo();
    if (mongo) {
      const updated = await EmergencyAlert.findOneAndUpdate(
        { id },
        {
          $set: {
            status,
            confirmedFacilities,
            acknowledgedAt: new Date()
          }
        },
        { new: true }
      ).lean();
      return updated;
    }

    const store = ensureLocalFileStore();
    const index = store.emergencyAlerts.findIndex(a => a.id === id);
    if (index === -1) return null;

    store.emergencyAlerts[index] = {
      ...store.emergencyAlerts[index],
      status,
      confirmedFacilities,
      acknowledgedAt: nowIso
    };
    saveLocalStore(store);
    return store.emergencyAlerts[index];
  },

  // USERS
  async authenticateUser(username, password) {
    const mongo = await connectToMongo();
    if (mongo) {
      await this.seedIfEmpty();
      const user = await User.findOne({ username }).lean();
      if (user && user.password === password) {
        return user;
      }
      return null;
    }
    const store = ensureLocalFileStore();
    const user = store.users.find(u => u.username.toLowerCase() === username.toLowerCase());
    if (user && user.password === password) {
      return user;
    }
    return null;
  }
};

