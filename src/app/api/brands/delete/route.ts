import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function DELETE(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { brandId } = await request.json();

    if (!brandId) {
      return NextResponse.json(
        { error: 'Brand ID is required' },
        { status: 400 }
      );
    }

    // Verify the brand belongs to the user
    const brand = await prisma.brand.findFirst({
      where: { id: brandId, userId: user.id },
    });

    if (!brand) {
      return NextResponse.json(
        { error: 'Brand not found or unauthorized' },
        { status: 404 }
      );
    }

    // Delete the brand
    await prisma.brand.delete({
      where: { id: brandId },
    });

    return NextResponse.json(
      { success: true, message: 'Brand deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Delete brand error:', error);
    return NextResponse.json(
      { error: 'Failed to delete brand' },
      { status: 500 }
    );
  }
}
