import { BotService } from './bot.service';
import { Action, Ctx, On, Start, Update } from 'nestjs-telegraf';
import { Context, Markup } from 'telegraf';
import { Bot } from './models/bot.model';

@Update()
export class BotUpdate {
  constructor(private readonly botService: BotService) {}
  @Start()
  async onStart(@Ctx() ctx: Context) {
    try {
      const user_id = ctx.from?.id;
      const user = await Bot.findOne({ where: { user_id: String(user_id) } });

      if (!user) {
        const newUser = await Bot.create({
          user_id: String(ctx.from?.id)!,
          first_name: ctx.from?.first_name,
          last_name: ctx.from?.last_name,
          last_state: 'role',
        });
        ctx.reply("Qaysi ro'ldan ro'yxatdan o'tmoqchisiz?", {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: 'Sahiy',
                  callback_data: `sahiy__${user_id}`,
                },
                {
                  text: 'Sabrli',
                  callback_data: `sabrli__${user_id}`,
                },
              ],
            ],
          },
        });
      }
    } catch (error) {
      console.log('Error on Start', error);
    }
  }

  @Action(/^sahiy__+\d+/)
  async onClickSahiy(@Ctx() ctx: Context) {
    try {
      const user_id = ctx.callbackQuery!['data'].split('__');
      const user = await Bot.findOne({ where: { user_id } });
      if (!user) {
        await ctx.reply("Siz hali ro'yxatdan o'tmagansiz", {
          parse_mode: 'HTML',
          ...Markup.keyboard(['/start']).resize().oneTime(),
        });
      } else {
        user.role = 'sahiy';
        user.last_state = 'name';
        await user.save();
        ctx.reply('Ismingizni kiriting:');
      }
    } catch (error) {
      console.log('Error on Click Sahiy', error);
    }
  }

  @On('text')
  async onText(@Ctx() ctx: Context) {
    try {
      const user_id = ctx.from?.id;
      const user = await Bot.findOne({ where: { user_id: String(user_id) } });
      if (!user) {
        await ctx.reply("Siz hali ro'yxatdan o'tmagansiz", {
          parse_mode: 'HTML',
          ...Markup.keyboard(['/start']).resize().oneTime(),
        });
      } else {
        if (user && user.last_state == 'name') {
          if ('text' in ctx.msg) {
            user.name = ctx.msg.text;
            user.last_state = 'phone_number';
            await user.save();

            ctx.reply('Telefon raqamingizni yuboring', {
              ...Markup.keyboard([
                Markup.button.contactRequest('Contactni ulashish'),
              ]).resize(),
            });
          }
        }
      }
    } catch (error) {
      console.log('Error on Text', error);
    }
  }

  @On('contact')
  async onContact(@Ctx() ctx: Context) {
    try {
      const user_id = ctx.from?.id;
      const user = await Bot.findOne({ where: { user_id: String(user_id) } });
      if (!user) {
        await ctx.reply("Siz hali ro'yxatdan o'tmagansiz", {
          parse_mode: 'HTML',
          ...Markup.keyboard(['/start']).resize().oneTime(),
        });
      } else {
        if (user && user.last_state == 'phone_number') {
          if ('contact' in ctx.msg) {
            user.phone_number = ctx.msg.contact.phone_number;
            user.last_state = 'location';
            ctx.reply(
              'Manzilingizni kiriting: ',
              Markup.keyboard(["O'tkazib yuborish"]).resize(),
            );
          }
        }
      }
    } catch (error) {
      console.log('Error on Contact', error);
    }
  }
}
