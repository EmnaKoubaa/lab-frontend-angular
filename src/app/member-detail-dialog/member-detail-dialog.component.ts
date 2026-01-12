import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MemberService } from 'src/services/member.service';
import { ResourceSyncService } from 'src/services/resource-sync.service';

@Component({
  selector: 'app-member-detail-dialog',
  templateUrl: './member-detail-dialog.component.html',
  styleUrls: ['./member-detail-dialog.component.css']
})
export class MemberDetailDialogComponent {
  member: any;
  students: any[] = [];

  // for adding a student
  availableStudents: any[] = [];
  selectedStudentId: string | null = null;
  showAddSection = false;
  loadingAvailable = false;

  encadrantLoading = false;

  fullLoading = false;

  constructor(
    public dialogRef: MatDialogRef<MemberDetailDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private ms: MemberService,
    private rs: ResourceSyncService
  ) {
    this.member = data.member;
    this.students = data.students || [];

    // ensure encadrant details are loaded when opening dialog for a student
    this.ensureEncadrantLoaded();

    // load full member if backend provides pubs/evts/outils via a dedicated endpoint
    this.fullLoading = false;
    this.loadFullMember();

    // subscribe to resource changes to refresh this member when relevant
    this.rs.onChange().subscribe((ch: any) => {
      if (!ch || !ch.memberIds || !this.member) return;
      if (ch.memberIds.indexOf(Number(this.member.id)) !== -1) {
        // if the resource change affects this member, reload their full data
        this.loadFullMember();
      }
    });
  }

  close(): void {
    this.dialogRef.close();
  }

  isStudent(): boolean {
    return this.member && (this.member.dateInscription !== undefined && this.member.dateInscription !== null);
  }

  isTeacher(): boolean {
    return !this.isStudent();
  }

  private ensureEncadrantLoaded(): void {
    if (!this.member || !this.member.encadrant) return;

    const enc = this.member.encadrant;
    let encId: string | null = null;

    if (typeof enc === 'number' || typeof enc === 'string') {
      encId = String(enc);
    } else if (enc && enc.id) {
      encId = String(enc.id);
    }

    // if we have an id but not the full object (no name), fetch it
    if (encId && (!(enc as any).nom || !(enc as any).prenom)) {
      this.encadrantLoading = true;
      this.ms.getRawMemberById(encId).subscribe(full => {
        // replace encadrant object with full member
        this.member.encadrant = full;
        this.encadrantLoading = false;
      }, err => {
        console.error('Failed to load encadrant details', err);
        this.encadrantLoading = false;
      });
    }
  }
  toggleAddStudent(): void {
    this.showAddSection = !this.showAddSection;
    if (this.showAddSection) {
      this.loadAvailableStudents();
    }
  }

  loadAvailableStudents(): void {
    this.loadingAvailable = true;
    this.ms.getAllMembersRaw().subscribe(list => {
      // students are members with dateInscription set and without encadrant
      this.availableStudents = (list || []).filter((m: any) => m.dateInscription && (!m.encadrant || m.encadrant === null));
      // exclude students already in this member.students (defensive)
      const existingIds = new Set(this.students.map(s => s.id));
      this.availableStudents = this.availableStudents.filter(s => !existingIds.has(s.id));
      this.loadingAvailable = false;
    }, err => {
      console.error('loadAvailableStudents error', err);
      this.loadingAvailable = false;
    });
  }

  assignSelectedStudent(): void {
    if (!this.selectedStudentId) return;
    this.ms.setEncadrant(this.selectedStudentId, this.member.id).subscribe(res => {
      // push the student object into the students list for UI update
      const s = this.availableStudents.find(a => a.id.toString() === this.selectedStudentId);
      if (s) {
        s.encadrant = { id: this.member.id };
        this.students.push(s);
        // remove from available
        this.availableStudents = this.availableStudents.filter(a => a.id.toString() !== this.selectedStudentId);
        this.selectedStudentId = null;
        this.showAddSection = false;
      }
    }, err => {
      console.error('assignSelectedStudent error', err);
      alert('Impossible d\'assigner l\'étudiant');
    });
  }

  removeStudent(studentId: number): void {
    // remove encadrant from the student
    this.ms.removeEncadrant(studentId.toString()).subscribe(res => {
      // remove from local students list
      this.students = this.students.filter(s => s.id !== studentId);
    }, err => {
      console.error('removeStudent error', err);
      alert('Impossible de supprimer l\'étudiant de la liste d\'encadrement');
    });
  }

  private loadFullMember(): void {
    if (!this.member || !this.member.id) return;
    this.fullLoading = true;
    this.ms.getFullMemberById(this.member.id).subscribe(full => {
      // backend may return pubs/evts/outils arrays
      (this.member as any).pubs = full && full.pubs ? full.pubs : [];
      (this.member as any).evts = full && full.evts ? full.evts : [];
      (this.member as any).outils = full && full.outils ? full.outils : [];
      this.fullLoading = false;
    }, err => {
      console.error('Failed to load full member data', err);
      // ensure arrays exist to avoid template errors
      (this.member as any).pubs = (this.member as any).pubs || [];
      (this.member as any).evts = (this.member as any).evts || [];
      (this.member as any).outils = (this.member as any).outils || [];
      this.fullLoading = false;
    });
  }
}
