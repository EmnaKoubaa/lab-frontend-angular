import { AfterViewInit, Component, ViewChild } from '@angular/core';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { OutilService } from 'src/services/outil.service';
import { ToolCreateComponent } from '../tool-create/tool-create.component';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';
import { Outil } from 'src/modeles/Outil';
import { ResourceSyncService } from 'src/services/resource-sync.service';
import { MemberService } from 'src/services/member.service';

@Component({
  selector: 'app-tool',
  templateUrl: './tool.component.html',
  styleUrls: ['./tool.component.css']
})
export class ToolComponent implements AfterViewInit {
  displayedColumns: string[] = ['id', 'date', 'source', 'actions'];
  dataSource: MatTableDataSource<Outil>;

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(private outilService: OutilService, private dialog: MatDialog, private rs: ResourceSyncService, private MS: MemberService) {
    this.dataSource = new MatTableDataSource<Outil>();
  }

  ngAfterViewInit(): void {
    this.loadData();
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  loadData() {
    this.outilService.getAllOutils().subscribe((res) => {
      this.dataSource.data = res;
    });
  }

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();
    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  openCreate() {
    const dialogRef = this.dialog.open(ToolCreateComponent);

    dialogRef.afterClosed().subscribe((data) => {
      if (data) {
        this.outilService.addOutil(data).subscribe((res:any) => {
          if (res) {
            this.loadData();
            const memberIds = data && data.membres ? data.membres.map((m:any)=>Number(m.id ?? m)) : (res && res.membres ? res.membres.map((m:any)=>Number(m.id)) : []);
            if (memberIds.length) {
              this.MS.affectMembersToOutil(res.id, memberIds).subscribe(() => {
                this.rs.emit({ type: 'outil', memberIds });
              }, (err: any) => {
                console.error('Failed to persist outil members', err);
                this.rs.emit({ type: 'outil', memberIds });
              });
            }
            this.outilService.setMembersForOutil(res.id, memberIds);
          } else {
            alert('Erreur lors de la création de l\'outil.');
          }
        }, err => {
          console.error('addOutil failed', err);
          alert('Erreur lors de la création de l\'outil.');
        });
      }
    });
  }

  openEdit(id: number) {
    // fetch original members first and fall back to cache
    this.outilService.getOutilById(String(id)).subscribe((orig:any) => {
      let originalMemberIds = orig && orig.membres ? (orig.membres.map((m:any) => Number(m.id))) : [];
      if (!originalMemberIds.length) {
        const cached = this.outilService.getMembersForOutil(Number(id));
        if (cached && cached.length) originalMemberIds = cached;
      }

      const dialogConfig = new MatDialogConfig();
      dialogConfig.data = { id: String(id), originalMemberIds };

      const dialogRef = this.dialog.open(ToolCreateComponent, dialogConfig);

      dialogRef.afterClosed().subscribe((data) => {
        if (data) {
          this.outilService.updateOutil(String(id), data).subscribe(() => {
            this.loadData();
            // Use dialog result to determine members
            const newMemberIds = data && data.membres ? data.membres.map((m:any)=>Number(m.id ?? m)) : [];
            const added = newMemberIds.filter((n:number) => originalMemberIds.indexOf(n) === -1);
            const removed = originalMemberIds.filter((o:number) => newMemberIds.indexOf(o) === -1);

            if (added.length) {
              this.MS.affectMembersToOutil(Number(id), added).subscribe(() => {
                const notify = Array.from(new Set([...added, ...removed]));
                if (notify.length) this.rs.emit({ type: 'outil', memberIds: notify });
              }, (err: any) => {
                console.error('Failed to persist added outil members', err);
                const notify = Array.from(new Set([...added, ...removed]));
                if (notify.length) this.rs.emit({ type: 'outil', memberIds: notify });
              });
            } else {
              const notify = Array.from(new Set([...added, ...removed]));
              if (notify.length) this.rs.emit({ type: 'outil', memberIds: notify });
            }

            this.outilService.setMembersForOutil(Number(id), newMemberIds);

            removed.forEach((rid: number) => {
              this.MS.removeMemberFromOutil(rid, Number(id)).subscribe(() => {}, () => {});
            });

          });
        }
      });
    });
  }

  delete(id: number) {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      //height: '200px',
      //width: '300px',
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.outilService.getOutilById(String(id)).subscribe((o:any)=>{
          const memberIds = o && o.membres ? o.membres.map((m:any)=>Number(m.id)) : [];
          this.outilService.deleteOutilById(String(id)).subscribe(()=>{
            this.loadData();
            if (memberIds.length) this.rs.emit({ type: 'outil', memberIds });
          });
        }, err => {
          this.outilService.deleteOutilById(String(id)).subscribe(()=>this.loadData());
        });
      }
    });
  }
}