import { AfterViewInit, Component, ViewChild } from '@angular/core';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { EventCreateComponent } from '../event-create/event-create.component';
import { EvtService } from 'src/services/evt.service';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';
import { ResourceSyncService } from 'src/services/resource-sync.service';
import { MemberService } from 'src/services/member.service';

@Component({
  selector: 'app-event',
  templateUrl: './event.component.html',
  styleUrls: ['./event.component.css']
})
export class EventComponent implements AfterViewInit {
   displayedColumns: string[] = ['ID', 'Titre', 'DateDeb','DateFin', 'Lieu', 'actions'];
  dataSource: MatTableDataSource<any>;

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(private evtService:EvtService, private dialog:MatDialog, private rs: ResourceSyncService, private MS: MemberService) {

    // Assign the data to the data source for the table to render
    this.dataSource = new MatTableDataSource();
  }
  ngAfterViewInit() {

    //remplir le tableau
    this.evtService.getAllEvents().subscribe((res)=>{
      this.dataSource.data=res; // .data==> att y5alih tahbat lel MatTableDataSource bch te5e4 données mte3ou
    })


    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();

    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }
  open(){
    // lancer la boite
    const dialogRef=this.dialog.open(EventCreateComponent); // lancer le thread observable
    dialogRef.afterClosed().subscribe((data)=>{ // bch na3rfou ki tetsaker
      if (data){
        this.evtService.addEvent(data).subscribe((res:any)=>{
        this.evtService.getAllEvents().subscribe((x)=>{
          this.dataSource.data=x;
        });
        // Prefer members from dialog selection to persist associations immediately
        const memberIds = data && data.membres ? data.membres.map((m:any) => Number(m.id ?? m)) : (res && res.membres ? res.membres.map((m:any)=>Number(m.id)) : []);
        if (memberIds.length) {
          // persist associations via MemberService
          // (MemberService methods added separately)
          this.MS.affectMembersToEvent(res.id, memberIds).subscribe(() => {
            this.rs.emit({ type: 'evt', memberIds });
          }, (err: any) => {
            console.error('Failed to persist event members', err);
            this.rs.emit({ type: 'evt', memberIds });
          });
        }
        // cache for immediate edits
        this.evtService.setMembersForEvent(res.id, memberIds);
      })//////////
      }
      
    }) 

  }

  openEdit(id: number){
    // fetch original members first and fall back to cache
    this.evtService.getEventById(String(id)).subscribe((orig:any) => {
      let originalMemberIds = orig && orig.membres ? (orig.membres.map((m:any) => Number(m.id))) : [];
      if (!originalMemberIds.length) {
        const cached = this.evtService.getMembersForEvent(Number(id));
        if (cached && cached.length) originalMemberIds = cached;
      }

      const dialogConfig = new MatDialogConfig();
      dialogConfig.data = { id: String(id), originalMemberIds };
      const dialogRef= this.dialog.open(EventCreateComponent,dialogConfig); // lancer le thread observable

      dialogRef.afterClosed().subscribe((data)=>{ // bch na3rfou ki tetsaker
        if (data) {
          this.evtService.updateEvent(String(id),data).subscribe(()=>{
            // Use dialog result to compute added/removed because backend may not return members on update
            this.evtService.getAllEvents().subscribe((x)=>{
              this.dataSource.data=x;
            });

            const newMemberIds = data && data.membres ? data.membres.map((m:any)=>Number(m.id ?? m)) : [];
            const added = newMemberIds.filter((n:number) => originalMemberIds.indexOf(n) === -1);
            const removed = originalMemberIds.filter((o:number) => newMemberIds.indexOf(o) === -1);

            if (added.length) {
              this.MS.affectMembersToEvent(Number(id), added).subscribe(() => {
                const notify = Array.from(new Set([...added, ...removed]));
                if (notify.length) this.rs.emit({ type: 'evt', memberIds: notify });
              }, (err: any) => {
                console.error('Failed to persist added event members', err);
                const notify = Array.from(new Set([...added, ...removed]));
                if (notify.length) this.rs.emit({ type: 'evt', memberIds: notify });
              });
            } else {
              const notify = Array.from(new Set([...added, ...removed]));
              if (notify.length) this.rs.emit({ type: 'evt', memberIds: notify });
            }

            // cache update and best-effort remove
            this.evtService.setMembersForEvent(Number(id), newMemberIds);
            removed.forEach((rid: number) => {
              this.MS.removeMemberFromEvent(rid, Number(id)).subscribe(() => {}, () => {});
            });

          })//////////
        }
      })
    });

}

delete(id: number) {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      //height: '200px',
      //width: '300px',
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        // fetch event before delete to know which members to refresh
        this.evtService.getEventById(String(id)).subscribe((e:any) => {
          const memberIds = e && e.membres ? e.membres.map((m:any) => Number(m.id)) : [];
          this.evtService.deleteEventById(String(id)).subscribe(() => {
            this.evtService.getAllEvents().subscribe((x) => {
              this.dataSource.data = x;
            });
            if (memberIds.length) this.rs.emit({ type: 'evt', memberIds });
          });
        }, err => {
          this.evtService.deleteEventById(String(id)).subscribe(() => this.evtService.getAllEvents().subscribe(x => this.dataSource.data = x));
        });
      }
    });
  }
  



 /* delete(id:string){
    //ouvrir une boite de dialogue de confirmation
      let dialogRef = this.dialog.open(ConfirmDialogComponent, {
        height: '200px',
        width: '300px',
      });
    //attendre la réponse de l'utilisateur
      dialogRef.afterClosed().subscribe(result => {
        if (result) {
          //si user click sur confirm ==> 
          this.evtService.deleteEventById(id).subscribe(()=>{  
          this.fetch();
          })
        }
      });
      //si user click sur confirm ==> 
  }*/


}
