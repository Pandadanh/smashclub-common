import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { SECURITY_CONTANTS } from "../constants/signature.constant";
import { verifyHmacSignature } from "../utils/signature-verify.util";

@Injectable()
export class XUserSessionGuard implements CanActivate{
    canActivate(context: ExecutionContext): boolean {
        const req = context.switchToHttp().getRequest();

         const header = req.header(SECURITY_CONTANTS.X_USER_SESSION_HEADER); 
        if(!header){
            throw new UnauthorizedException('Missing X-UserSession header');
        }
        let decoded :string;
        try{
            decoded =Buffer.from(header,'base64').toString('utf8');
        }catch(err){
           throw new UnauthorizedException('Invalid Base64 in X-UserSession');
        }

        const [timestampStr, signature] = decoded.split('|');

        if(!timestampStr || !signature){
            throw new UnauthorizedException('Invalid X-UserSession format');
        }

        const timestamp= Number(timestampStr);
        if(!Number.isFinite(timestamp)){
            throw new UnauthorizedException('Invalid timestamp');
        }

        const now = Date.now();

        if(Math.abs(now - timestamp)>SECURITY_CONTANTS.MAX_CLOCK_SKEW_MS){
            throw new UnauthorizedException('X-UserSession expired');
        }

        const rawData = `${timestamp}|${process.env.STATIC_APP_KEY!}`;
        const valid= verifyHmacSignature(
            rawData,
            signature,
            process.env.HMAC_SHARED_SECRET!
        )
         if (!valid) {
        throw new UnauthorizedException('Invalid X-UserSession signature');
        }

        return true;
    }
   
}