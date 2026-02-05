import { createHmac, timingSafeEqual, verify } from "crypto"


export function buildHmacSignature(
    data: string,
    secret: string,
):string{
    return createHmac('sha256',secret).update(data).digest('hex');
}
export function verifyHmacSignature(
    data:string,
    provided: string,
    secret: string,
): boolean{
   const expected = buildHmacSignature(data,secret);

   const sigBuf = Buffer.from(provided, 'utf8');
   const expectedBuf = Buffer.from(expected, 'utf8');

   if(sigBuf.length !== expectedBuf.length) return false;

   return timingSafeEqual(sigBuf,expectedBuf);
}   


    

