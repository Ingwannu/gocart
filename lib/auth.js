import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { applyCurrentSessionUser } from "@/lib/session-user.mjs";
import { normalizeAuthEmail } from "@/lib/user-admin.mjs";

if (process.env.NODE_ENV === "production" && !process.env.NEXTAUTH_SECRET) {
	throw new Error("NEXTAUTH_SECRET must be set in production");
}

export const authOptions = {
	providers: [
		{
			id: "credentials",
			name: "Credentials",
			type: "credentials",
			credentials: {
				email: { label: "Email", type: "email" },
				password: { label: "Password", type: "password" },
			},
			async authorize(credentials) {
				if (!credentials?.email || !credentials?.password) return null;
				const email = normalizeAuthEmail(credentials.email);
				if (!email) return null;

				const user = await prisma.user.findUnique({
					where: { email },
				});

				if (!user || user.isSuspended) return null;

				const isValid = await bcrypt.compare(
					credentials.password,
					user.password,
				);
				if (!isValid) return null;

				return {
					id: user.id,
					name: user.name,
					email: user.email,
					image: user.image,
					role: user.role,
				};
			},
		},
	],
	session: {
		strategy: "jwt",
	},
	callbacks: {
		async jwt({ token, user }) {
			if (user) {
				token.role = user.role;
				token.id = user.id;
			}
			return token;
		},
		async session({ session, token }) {
			if (session.user && token.id) {
				const dbUser = await prisma.user.findUnique({
					where: { id: token.id },
					select: {
						id: true,
						name: true,
						email: true,
						image: true,
						role: true,
						isSuspended: true,
					},
				});
				return applyCurrentSessionUser(session, token, dbUser);
			}
			return session;
		},
	},
	pages: {
		signIn: "/login",
	},
	secret: process.env.NEXTAUTH_SECRET || "wicked-shop-dev-secret-key-2025",
};

export default authOptions;
