// MongoDB initialization script
db = db.getSiblingDB('tofas-fen');

// Create collections
db.createCollection('users');
db.createCollection('announcements');
db.createCollection('clubs');
db.createCollection('notes');
db.createCollection('homeworks');
db.createCollection('notifications');
db.createCollection('requests');
db.createCollection('evci_requests');
db.createCollection('maintenance_requests');
db.createCollection('meal_lists');
db.createCollection('supervisor_lists');
db.createCollection('files');
db.createCollection('analytics');
db.createCollection('performance');
db.createCollection('reports');
db.createCollection('schedules');
db.createCollection('calendar');
db.createCollection('communication');
db.createCollection('club_announcements');
db.createCollection('club_events');
db.createCollection('club_chat');

// Create indexes for better performance
db.users.createIndex({ "email": 1 }, { unique: true });
db.users.createIndex({ "studentNumber": 1 }, { unique: true, sparse: true });
db.users.createIndex({ "role": 1 });
db.users.createIndex({ "createdAt": 1 });

db.announcements.createIndex({ "createdAt": -1 });
db.announcements.createIndex({ "targetRoles": 1 });
db.announcements.createIndex({ "isActive": 1 });

db.clubs.createIndex({ "name": 1 });
db.clubs.createIndex({ "advisor": 1 });
db.clubs.createIndex({ "isActive": 1 });

db.notes.createIndex({ "studentId": 1 });
db.notes.createIndex({ "teacherId": 1 });
db.notes.createIndex({ "createdAt": -1 });

db.homeworks.createIndex({ "studentId": 1 });
db.homeworks.createIndex({ "teacherId": 1 });
db.homeworks.createIndex({ "dueDate": 1 });
db.homeworks.createIndex({ "subject": 1 });

db.notifications.createIndex({ "userId": 1 });
db.notifications.createIndex({ "createdAt": -1 });
db.notifications.createIndex({ "isRead": 1 });

db.requests.createIndex({ "userId": 1 });
db.requests.createIndex({ "status": 1 });
db.requests.createIndex({ "createdAt": -1 });

db.evci_requests.createIndex({ "studentId": 1 });
db.evci_requests.createIndex({ "parentId": 1 });
db.evci_requests.createIndex({ "status": 1 });
db.evci_requests.createIndex({ "requestDate": -1 });

db.maintenance_requests.createIndex({ "userId": 1 });
db.maintenance_requests.createIndex({ "status": 1 });
db.maintenance_requests.createIndex({ "priority": 1 });
db.maintenance_requests.createIndex({ "createdAt": -1 });

db.meal_lists.createIndex({ "date": 1 });
db.meal_lists.createIndex({ "mealType": 1 });

db.supervisor_lists.createIndex({ "date": 1 });
db.supervisor_lists.createIndex({ "shift": 1 });

db.files.createIndex({ "uploadedBy": 1 });
db.files.createIndex({ "category": 1 });
db.files.createIndex({ "uploadedAt": -1 });

db.analytics.createIndex({ "date": 1 });
db.analytics.createIndex({ "type": 1 });

db.performance.createIndex({ "userId": 1 });
db.performance.createIndex({ "date": -1 });

db.reports.createIndex({ "generatedBy": 1 });
db.reports.createIndex({ "type": 1 });
db.reports.createIndex({ "createdAt": -1 });

db.schedules.createIndex({ "class": 1 });
db.schedules.createIndex({ "day": 1 });
db.schedules.createIndex({ "period": 1 });

db.calendar.createIndex({ "date": 1 });
db.calendar.createIndex({ "type": 1 });

db.communication.createIndex({ "senderId": 1 });
db.communication.createIndex({ "receiverId": 1 });
db.communication.createIndex({ "createdAt": -1 });

db.club_announcements.createIndex({ "clubId": 1 });
db.club_announcements.createIndex({ "createdAt": -1 });

db.club_events.createIndex({ "clubId": 1 });
db.club_events.createIndex({ "date": 1 });

db.club_chat.createIndex({ "clubId": 1 });
db.club_chat.createIndex({ "createdAt": -1 });

// Insert initial admin user
db.users.insertOne({
  name: "System Administrator",
  email: "admin@tofasfen.edu.tr",
  password: "$2b$10$rQZ8K9vL8mN7pQ6rS5tT.uVwXyZ1aB2cD3eF4gH5iJ6kL7mN8oP9qR",
  role: "admin",
  studentNumber: null,
  class: null,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  lastLogin: null,
  profile: {
    phone: "",
    address: "",
    emergencyContact: "",
    bloodType: "",
    allergies: "",
    medicalNotes: ""
  },
  preferences: {
    notifications: true,
    emailNotifications: true,
    smsNotifications: false,
    theme: "light",
    language: "tr"
  }
});

print("Database initialization completed successfully!");
