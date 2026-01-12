import { Component, Inject } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { EvtService } from 'src/services/evt.service';
import { Evt } from 'src/modeles/Evt';
import { MemberService } from 'src/services/member.service';

@Component({
  selector: 'app-event-create',
  templateUrl: './event-create.component.html',
  styleUrls: ['./event-create.component.css']
})
export class EventCreateComponent {
  form!: FormGroup;
  members: any[] = [];

  constructor(
    private dialogRef: MatDialogRef<EventCreateComponent>,
    @Inject(MAT_DIALOG_DATA) public data: string | null,
    private ES: EvtService,
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
        this.ES.getEventById(editId).subscribe((evt: Evt) => {
          const selected = (evt as any).membres ? (evt as any).membres.map((m: any) => m.id || m) : fallbackSelected;        console.debug('EventCreate init edit', { editId, selected, fallbackSelected, membersLoaded: this.members.length });          this.form = new FormGroup({
            titre: new FormControl(evt.titre, Validators.required),
            dateDeb: new FormControl(this.parseDate(evt.dateDeb), Validators.required),
            dateFin: new FormControl(this.parseDate(evt.dateFin), Validators.required),
            lieu: new FormControl(evt.lieu, Validators.required),
            membres: new FormControl(selected, Validators.required)
          });
        }, err => {
          console.error('getEventById error', err);
          this.form = new FormGroup({
            titre: new FormControl(null, Validators.required),
            dateDeb: new FormControl(null, Validators.required),
            dateFin: new FormControl(null, Validators.required),
            lieu: new FormControl(null, Validators.required),
            membres: new FormControl(fallbackSelected, Validators.required)
          });
        });
      } else {
        this.form = new FormGroup({
          titre: new FormControl(null, Validators.required),
          dateDeb: new FormControl(null, Validators.required),
          dateFin: new FormControl(null, Validators.required),
          lieu: new FormControl(null, Validators.required),
          membres: new FormControl([], Validators.required)
        });
      }
    } else {
      this.form = new FormGroup({
        titre: new FormControl(null, Validators.required),
        dateDeb: new FormControl(null, Validators.required),
        dateFin: new FormControl(null, Validators.required),
        lieu: new FormControl(null, Validators.required),
        membres: new FormControl([], Validators.required)
      });
    }
  }

  /**
   * Convertit une date string en objet Date pour le DatePicker
   * Supporte plusieurs formats: "DD/MM/YYYY", "YYYY-MM-DD", timestamp, etc.
   */
  private parseDate(value: any): Date | null {
    if (!value) {
      return null;
    }

    // Si c'est déjà un objet Date
    if (value instanceof Date) {
      return value;
    }

    // Si c'est un string
    if (typeof value === 'string') {
      // Format "DD/MM/YYYY" ou "DD-MM-YYYY"
      if (value.includes('/') || value.includes('-')) {
        const parts = value.split(/[/-]/);
        
        // Si format DD/MM/YYYY
        if (parts[0].length <= 2) {
          const day = parseInt(parts[0], 10);
          const month = parseInt(parts[1], 10) - 1; // Les mois commencent à 0
          const year = parseInt(parts[2], 10);
          return new Date(year, month, day);
        }
        // Si format YYYY-MM-DD
        else if (parts[0].length === 4) {
          return new Date(value);
        }
      }
      
      // Essayer de parser directement
      const date = new Date(value);
      return isNaN(date.getTime()) ? null : date;
    }

    // Si c'est un timestamp
    if (typeof value === 'number') {
      return new Date(value);
    }

    return null;
  }

  /**
   * Formate un objet Date en string "DD/MM/YYYY"
   */
  private formatDate(value: any): string {
    if (!value) {
      return '';
    }
    
    const d = value instanceof Date ? value : new Date(value);
    
    if (isNaN(d.getTime())) {
      return '';
    }
    
    // return ISO yyyy-mm-dd which is safer for backend parsing
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

// compare function for mat-select to handle object/primitive id comparisons
  compareMember(a: any, b: any) {
    if (a == null || b == null) return false;
    const aid = typeof a === 'object' ? (a.id ?? a) : a;
    const bid = typeof b === 'object' ? (b.id ?? b) : b;
    return Number(aid) === Number(bid);
  }

  save() {
    const raw = this.form.value;
    const value: any = {
      ...raw,
      dateDeb: this.formatDate(raw.dateDeb),
      dateFin: this.formatDate(raw.dateFin)
    };
    // map selected members to objects
    const sel = raw.membres || [];
    value.membres = sel.map((id: any) => ({ id: Number(id) }));
    console.debug('EventCreate save', { payload: value });
    this.dialogRef.close(value);
  }

  close() {
    this.dialogRef.close();
  }
}