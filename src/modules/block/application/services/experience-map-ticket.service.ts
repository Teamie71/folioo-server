import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

const DEFAULT_TICKET_TTL_SECONDS = 300;

interface ExperienceMapTicketPayload {
    sub: string;
    sid: string;
}

export interface IssuedTicket {
    ticket: string;
    expiresIn: number;
}

@Injectable()
export class ExperienceMapTicketService {
    constructor(
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService
    ) {}

    issueTicket(userId: number, sessionId: string): IssuedTicket {
        const expiresIn = Number(
            this.configService.get<string>('EXPMAP_TICKET_TTL_SECONDS') ??
                DEFAULT_TICKET_TTL_SECONDS
        );
        const payload: ExperienceMapTicketPayload = { sub: String(userId), sid: sessionId };
        const ticket = this.jwtService.sign(payload, { expiresIn });
        return { ticket, expiresIn };
    }
}
