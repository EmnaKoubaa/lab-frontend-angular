import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from 'src/services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  email:string='';
  password:string='';
  constructor(private AS:AuthService, private router:Router) { }

  Sub(){ //invoquer lle service qui genere JWT
    this.AS.signInWithEmailAndPassword(this.email,this.password).then((result)=>{ //mayraja3ch observable ==> sbuscribe with then (cas success)
      const userEmail = result.user?.email || '';
      if (userEmail === 'admin@lab.com') {
        this.router.navigate(['/dashboard']);
      } else {
        this.router.navigate(['/member']);
      }
    }) 

  }

  forgotPassword(){
    if(!this.email){
      alert('Veuillez saisir votre email pour réinitialiser le mot de passe');
      return;
    }
    this.AS.resetPassword(this.email).then(()=>{
      alert('Un email de réinitialisation a été envoyé.');
    });
  }

  continueAsVisitor(){
    this.router.navigate(['/dashboard']);
  }

}
