/**
 * GraphQL Schema Definition
 * BFF (Backend for Frontend) layer
 */

import { gql } from 'apollo-server-express';

export const typeDefs = gql`
  scalar Date
  scalar JSON

  type Query {
    # User queries
    me: User
    user(id: ID!): User
    users(role: String, page: Int, limit: Int): UserConnection

    # Announcement queries
    announcements(filters: AnnouncementFilters, page: Int, limit: Int): AnnouncementConnection
    announcement(id: ID!): Announcement

    # Homework queries
    homeworks(filters: HomeworkFilters, page: Int, limit: Int): HomeworkConnection
    homework(id: ID!): Homework
    myHomeworks: [Homework!]!

    # Note queries
    notes(filters: NoteFilters, page: Int, limit: Int): NoteConnection
    note(id: ID!): Note
    myNotes: [Note!]!

    # Evci Request queries
    evciRequests(filters: EvciRequestFilters, page: Int, limit: Int): EvciRequestConnection
    evciRequest(id: ID!): EvciRequest
    myEvciRequests: [EvciRequest!]!

    # Club queries
    clubs(filters: ClubFilters, page: Int, limit: Int): ClubConnection
    club(id: ID!): Club
    myClubs: [Club!]!

    # Dormitory queries
    meals(date: String): [Meal!]!
    supervisors: [Supervisor!]!
    maintenanceRequests(filters: MaintenanceRequestFilters): [MaintenanceRequest!]!

    # Schedule queries
    schedule(classId: ID, teacherId: ID): [ScheduleItem!]!

    # Analytics queries
    dashboardStats(role: String!): DashboardStats
  }

  type Mutation {
    # Auth mutations
    login(id: String!, sifre: String!): AuthPayload
    logout: Boolean
    updateProfile(input: UpdateProfileInput!): User
    # changePassword kaldırıldı - artık TCKN kullanılıyor ve değiştirilemez

    # Announcement mutations
    createAnnouncement(input: CreateAnnouncementInput!): Announcement
    updateAnnouncement(id: ID!, input: UpdateAnnouncementInput!): Announcement
    deleteAnnouncement(id: ID!): Boolean

    # Homework mutations
    createHomework(input: CreateHomeworkInput!): Homework
    updateHomework(id: ID!, input: UpdateHomeworkInput!): Homework
    deleteHomework(id: ID!): Boolean
    submitHomework(id: ID!, input: SubmitHomeworkInput!): Homework

    # Note mutations
    addNote(input: AddNoteInput!): Note
    updateNote(id: ID!, input: UpdateNoteInput!): Note
    deleteNote(id: ID!): Boolean

    # Evci Request mutations
    createEvciRequest(input: CreateEvciRequestInput!): EvciRequest
    updateEvciRequest(id: ID!, input: UpdateEvciRequestInput!): EvciRequest
    deleteEvciRequest(id: ID!): Boolean

    # Club mutations
    createClub(input: CreateClubInput!): Club
    joinClub(clubId: ID!, code: String): Club
    leaveClub(clubId: ID!): Boolean

    # Maintenance mutations
    createMaintenanceRequest(input: CreateMaintenanceRequestInput!): MaintenanceRequest
    updateMaintenanceRequest(id: ID!, input: UpdateMaintenanceRequestInput!): MaintenanceRequest
  }

  # Types
  type User {
    id: ID!
    adSoyad: String!
    rol: String!
    email: String
    sinif: String
    sube: String
    oda: String
    pansiyon: Boolean!
    isActive: Boolean!
    createdAt: Date!
    updatedAt: Date!
  }

  type Announcement {
    id: ID!
    title: String!
    content: String!
    targetAudience: [String!]!
    priority: String!
    createdBy: User!
    createdAt: Date!
    updatedAt: Date!
  }

  type Homework {
    id: ID!
    title: String!
    description: String!
    dueDate: Date!
    assignedTo: [User!]!
    createdBy: User!
    submissions: [HomeworkSubmission!]!
    createdAt: Date!
    updatedAt: Date!
  }

  type HomeworkSubmission {
    id: ID!
    student: User!
    content: String
    submittedAt: Date
    grade: Float
  }

  type Note {
    id: ID!
    student: User!
    subject: String!
    examType: String!
    score: Float!
    maxScore: Float!
    createdAt: Date!
    updatedAt: Date!
  }

  type EvciRequest {
    id: ID!
    student: User!
    startDate: Date!
    endDate: Date!
    destination: String!
    status: String!
    approvedBy: User
    approvedAt: Date
    createdAt: Date!
  }

  type Club {
    id: ID!
    name: String!
    description: String!
    advisor: User!
    members: [User!]!
    createdAt: Date!
  }

  type Meal {
    id: ID!
    date: Date!
    mealType: String!
    items: [String!]!
  }

  type Supervisor {
    id: ID!
    name: String!
    phone: String
    shift: String!
  }

  type MaintenanceRequest {
    id: ID!
    title: String!
    description: String!
    priority: String!
    status: String!
    location: String
    createdBy: User!
    createdAt: Date!
  }

  type ScheduleItem {
    id: ID!
    day: String!
    period: Int!
    subject: String!
    teacher: User!
    classroom: String
  }

  type DashboardStats {
    totalAnnouncements: Int!
    totalHomeworks: Int!
    pendingEvciRequests: Int!
    unreadNotifications: Int!
  }

  # Connection types for pagination
  type UserConnection {
    nodes: [User!]!
    totalCount: Int!
    pageInfo: PageInfo!
  }

  type AnnouncementConnection {
    nodes: [Announcement!]!
    totalCount: Int!
    pageInfo: PageInfo!
  }

  type HomeworkConnection {
    nodes: [Homework!]!
    totalCount: Int!
    pageInfo: PageInfo!
  }

  type NoteConnection {
    nodes: [Note!]!
    totalCount: Int!
    pageInfo: PageInfo!
  }

  type EvciRequestConnection {
    nodes: [EvciRequest!]!
    totalCount: Int!
    pageInfo: PageInfo!
  }

  type ClubConnection {
    nodes: [Club!]!
    totalCount: Int!
    pageInfo: PageInfo!
  }

  type PageInfo {
    hasNextPage: Boolean!
    hasPreviousPage: Boolean!
    currentPage: Int!
    totalPages: Int!
  }

  # Input types
  input AnnouncementFilters {
    targetAudience: [String!]
    priority: String
    createdBy: ID
  }

  input HomeworkFilters {
    assignedTo: ID
    createdBy: ID
    dueDateFrom: Date
    dueDateTo: Date
  }

  input NoteFilters {
    studentId: ID
    subject: String
    examType: String
  }

  input EvciRequestFilters {
    studentId: ID
    status: String
  }

  input ClubFilters {
    advisorId: ID
    memberId: ID
  }

  input MaintenanceRequestFilters {
    status: String
    priority: String
  }

  input UpdateProfileInput {
    adSoyad: String
    email: String
  }

  # ChangePasswordInput kaldırıldı - artık TCKN kullanılıyor ve değiştirilemez

  input CreateAnnouncementInput {
    title: String!
    content: String!
    targetAudience: [String!]!
    priority: String
  }

  input UpdateAnnouncementInput {
    title: String
    content: String
    priority: String
  }

  input CreateHomeworkInput {
    title: String!
    description: String!
    dueDate: Date!
    assignedTo: [ID!]!
  }

  input UpdateHomeworkInput {
    title: String
    description: String
    dueDate: Date
  }

  input SubmitHomeworkInput {
    content: String!
  }

  input AddNoteInput {
    studentId: ID!
    subject: String!
    examType: String!
    score: Float!
    maxScore: Float!
  }

  input UpdateNoteInput {
    score: Float
    maxScore: Float
  }

  input CreateEvciRequestInput {
    startDate: Date!
    endDate: Date!
    destination: String!
    description: String
  }

  input UpdateEvciRequestInput {
    status: String
    reason: String
  }

  input CreateClubInput {
    name: String!
    description: String!
  }

  input CreateMaintenanceRequestInput {
    title: String!
    description: String!
    priority: String
    location: String
  }

  input UpdateMaintenanceRequestInput {
    status: String
    priority: String
  }

  type AuthPayload {
    user: User!
    accessToken: String!
    refreshToken: String!
    expiresIn: Int!
  }
`;

