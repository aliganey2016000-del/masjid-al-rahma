/**
 * Sidebar Setting Model
 * Per-organization show/hide overrides for a portal's sidebar items
 * (currently only the student portal). One document per (school, portal).
 * An item with no override is visible by default.
 */

import mongoose, { Schema, Document } from 'mongoose';

export interface ISidebarItemOverride {
  key: string;
  visible: boolean;
}

export interface ISidebarSetting extends Document {
  _id: mongoose.Types.ObjectId;
  school: mongoose.Types.ObjectId;
  portal: 'student';
  items: ISidebarItemOverride[];
  updatedBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const sidebarItemOverrideSchema = new Schema<ISidebarItemOverride>(
  {
    key: { type: String, required: true, trim: true },
    visible: { type: Boolean, required: true, default: true },
  },
  { _id: false }
);

const sidebarSettingSchema = new Schema<ISidebarSetting>(
  {
    school: { type: Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    portal: { type: String, enum: ['student'], default: 'student' },
    items: { type: [sidebarItemOverrideSchema], default: [] },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true, toJSON: { transform(_doc: any, ret: any) { delete ret.__v; return ret; } } }
);

sidebarSettingSchema.index({ school: 1, portal: 1 }, { unique: true });

export default mongoose.model<ISidebarSetting>('SidebarSetting', sidebarSettingSchema);
