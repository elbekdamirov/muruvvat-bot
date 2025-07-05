import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Bot } from './models/bot.model';
import { Ctx, InjectBot } from 'nestjs-telegraf';
import { BOT_NAME } from '../../app.constants';
import { Context, Markup, Telegraf } from 'telegraf';

@Injectable()
export class BotService {
  constructor(
    @InjectModel(Bot) private botModel: typeof Bot,
    @InjectBot(BOT_NAME) private readonly bot: Telegraf<Context>,
  ) {}

  async start(ctx: Context) {
    try {
      const user_id = ctx.from?.id;
      const user = await this.botModel.findOne({ where: { user_id } });

      if (!user) {
        await this.botModel.create({
          user_id: ctx.from?.id!,
          first_name: ctx.from?.first_name,
          last_name: ctx.from?.last_name,
          last_state: 'role',
        });
      }

      await ctx.reply(
        "Qaysi roledan ro'yxatdan o'tmoqchisiz?",
        Markup.inlineKeyboard([
          [
            Markup.button.callback('Sahiy', `sahiy__${user_id}`),
            Markup.button.callback('Sabrli', `sabrli__${user_id}`),
          ],
        ]),
      );
    } catch (error) {
      console.log('Error on Start: ', error);
    }
  }

  async ClickRole(ctx: Context) {
    try {
      const callbackData =
        'data' in ctx.callbackQuery! ? ctx.callbackQuery.data : '';
      const [role, user_id] = callbackData.split('__');

      const user = await this.botModel.findOne({ where: { user_id } });

      if (!user) {
        await ctx.replyWithHTML("Siz hali ro'yxatdan o'tmagansiz", {
          parse_mode: 'HTML',
          ...Markup.keyboard(['/start']).resize().oneTime(),
        });
      } else {
        user.role = role; // 'sahiy' yoki 'sabrli'
        user.last_state = 'name';
        await user.save();

        await ctx.reply('Ismingizni kiriting:');
      }
    } catch (error) {
      console.log('Error on ClickRole:', error);
    }
  }

  async text(ctx: Context) {
    try {
      const user_id = ctx.from?.id;
      const user = await Bot.findOne({ where: { user_id } });
      if (!user) {
        await ctx.reply("Siz hali ro'yxatdan o'tmagansiz", {
          parse_mode: 'HTML',
          ...Markup.keyboard(['/start']).resize().oneTime(),
        });
      } else {
        if (user.last_state == 'name') {
          if ('text' in ctx.message!) {
            user.name = ctx.message.text;
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

      if (
        user!.last_state === 'location' &&
        'text' in ctx.message! &&
        ctx.message.text === "O'tkazib yuborish"
      ) {
        user!.last_state = 'finish';
        await user!.save();

        await ctx.reply(
          "Manzil kiritilmadi. Ro'yxatdan o'tish yakunlandi.",
          Markup.removeKeyboard(),
        );
      }
    } catch (error) {
      console.log('Error on Text', error);
    }
  }

  async contact(ctx: Context) {
    try {
      const user_id = ctx.from?.id;
      const user = await Bot.findOne({ where: { user_id } });
      if (!user) {
        await ctx.reply("Siz hali ro'yxatdan o'tmagansiz", {
          parse_mode: 'HTML',
          ...Markup.keyboard(['/start']).resize().oneTime(),
        });
      } else {
        if (user.last_state == 'phone_number') {
          if ('contact' in ctx.msg) {
            user.phone_number = ctx.msg.contact.phone_number;
            user.last_state = 'location';
            await user.save();
            ctx.reply(
              'Manzilingizni kiriting:',
              Markup.keyboard([
                [Markup.button.locationRequest('📍 Lokatsiyani ulashish')],
                ["O'tkazib yuborish"],
              ]).resize(),
            );
          }
        }
      }
    } catch (error) {
      console.log('Error on Contact', error);
    }
  }

  async location(ctx: Context) {
    try {
      const user_id = ctx.from?.id;
      const user = await this.botModel.findOne({ where: { user_id } });

      if (!user) {
        await ctx.reply("Siz hali ro'yxatdan o'tmagansiz", {
          parse_mode: 'HTML',
          ...Markup.keyboard(['/start']).resize().oneTime(),
        });
      } else {
        if (user.last_state === 'location') {
          if ('location' in ctx.message!) {
            const location = ctx.message.location;
            user.location = `${location.latitude},${location.longitude}`;
            user.last_state = 'finish';
            await user.save();

            await ctx.reply(
              "Ro'yxatdan o'tish yakunlandi. Rahmat!",
              Markup.removeKeyboard(),
            );
          }
        }
      }
    } catch (error) {
      console.log('Error on Location:', error);
    }
  }

  async stop(ctx: Context) {
    try {
      const user_id = ctx.from?.id;
      const user = await this.botModel.findOne({
        where: { user_id: String(user_id) },
      });

      if (!user) {
        await ctx.replyWithHTML(`Siz avval ro'yxattan o'tmagansiz`, {
          ...Markup.removeKeyboard(),
        });
      } else if (user.status) {
        user.status = false;
        await user.save();

        await ctx.replyWithHTML(
          `Siz vaqtincha botdan chiqib ketdingiz. Qayta faollashtirish uchun /start tugmasini bosing!`,
          {
            ...Markup.keyboard([['/start']]).resize(),
          },
        );
      }
    } catch (error) {
      console.log(`❌ Error on Stop: `, error);
    }
  }
}
