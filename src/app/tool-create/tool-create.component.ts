import { Component, Inject } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { OutilService } from 'src/services/outil.service';
import { Outil } from 'src/modeles/Outil';
import { MemberService } from 'src/services/member.service';

@Component({
  selector: 'app-tool-create',
  templateUrl: './tool-create.component.html',
  styleUrls: ['./tool-create.component.css']
})
export class ToolCreateComponent {
  form!: FormGroup;
  members: any[] = [];

  constructor(
    private dialogRef: MatDialogRef<ToolCreateComponent>,
    @Inject(MAT_DIALOG_DATA) public data: string | null,
    private outilService: OutilService,
    private memberService: MemberService
  ) {
    // load members list
    this.memberService.getAllMembersRaw().subscribe((list: any[]) => this.members = list || [], (err: any) => {
      console.error('Failed to load members', err);
      this.members = [];
    });

    if (data) {
      // data may be string id or object { id, originalMemberIds }
      const editId = typeof data === 'string' ? data : (data && (data as any).id ? (data as any).id : null);
      const fallbackSelected = (data && (data as any).originalMemberIds) ? (data as any).originalMemberIds : [];

      if (editId) {
        this.outilService.getOutilById(editId).subscribe((o: Outil) => {
          const selected = (o as any).membres ? (o as any).membres.map((m: any) => m.id || m) : fallbackSelected;
          console.debug('ToolCreate init edit', { editId, selected, fallbackSelected, membersLoaded: this.members.length });
          this.form = new FormGroup({
            source: new FormControl(o.source, Validators.required),
            membres: new FormControl(selected, Validators.required)
          });
        }, err => {
          console.error('getOutilById error', err);
          // fallback to empty form so dialog remains usable
          this.form = new FormGroup({
            source: new FormControl(null, Validators.required),
            membres: new FormControl(fallbackSelected, Validators.required)
          });
        });
      } else {
        // Create
        this.form = new FormGroup({
          source: new FormControl(null, Validators.required),
          membres: new FormControl([], Validators.required)
        });
      }
    } else {
      // Create
      this.form = new FormGroup({
        source: new FormControl(null, Validators.required),
        membres: new FormControl([], Validators.required)
      });
    }
  }

  private getTodayFormatted(): string {
    // use ISO date (yyyy-mm-dd) to be consistent with backend expectations
    return new Date().toISOString().slice(0, 10);
  }

  // compare function for mat-select to handle object/primitive id comparisons
  compareMember(a: any, b: any) {
    if (a == null || b == null) return false;
    const aid = typeof a === 'object' ? (a.id ?? a) : a;
    const bid = typeof b === 'object' ? (b.id ?? b) : b;
    return Number(aid) === Number(bid);
  }

  save() {
    if (!this.form) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = { ...this.form.value, date: this.getTodayFormatted() };
    const sel = raw.membres || [];
    raw.membres = sel.map((id: any) => ({ id: Number(id) }));

    console.debug('ToolCreate save', { payload: raw });
    this.dialogRef.close(raw);
  }

  close() {
    this.dialogRef.close();
  }
}