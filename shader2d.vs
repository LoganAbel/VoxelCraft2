#version 300 es

layout(location = 0) in vec4 a_pos;

uniform float u_aspect;
 
void main() {
   gl_Position = vec4(a_pos.x * u_aspect, a_pos.y, 0, 1);
}