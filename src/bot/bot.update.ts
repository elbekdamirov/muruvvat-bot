import { BotService } from './bot.service';
import { Action, Command, Ctx, On, Start, Update } from 'nestjs-telegraf';
import { Context } from 'telegraf';

@Update()
export class BotUpdate {
  constructor(private readonly botService: BotService) {}

  @Start()
  async onStart(@Ctx() ctx: Context) {
    await this.botService.start(ctx);
  }

  @Action(/^(sahiy|sabrli)__\d+$/)
  async onClickRole(@Ctx() ctx: Context) {
    await this.botService.ClickRole(ctx);
  }

  @On('text')
  async onText(@Ctx() ctx: Context) {
    await this.botService.text(ctx);
  }

  @On('contact')
  async contact(@Ctx() ctx: Context) {
    await this.botService.contact(ctx);
  }

  @On('location')
  async location(@Ctx() ctx: Context) {
    await this.botService.location(ctx);
  }

  @Command('stop')
  async onStop(@Ctx() ctx: Context) {
    await this.botService.stop(ctx);
  }
}
